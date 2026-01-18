# Quack Implementation Plan

A stacked PR implementation plan following the phases in [initial.md](initial.md) and conventions in [../agents.md](../agents.md).

**Summary**: 9 incremental, independently testable PRs building toward a complete local-first BI tool.

---

## PR #1: Backend Scaffold (Fastify + DuckDB Setup)

**Branch**: `01-backend-scaffold`  
**Base**: `main`  
**Goal**: Establish the monorepo structure and core backend infrastructure.

### Deliverables

- [ ] pnpm workspace configuration
- [ ] Backend package with Fastify server
- [ ] DuckDB connection singleton
- [ ] Metadata schema initialization
- [ ] Health check endpoint
- [ ] Test infrastructure

### Implementation Steps

1. **Initialize monorepo**
   - Create root `package.json` with workspace scripts
   - Create `pnpm-workspace.yaml` defining `packages/*`
   - Create `tsconfig.base.json` with strict TypeScript settings

2. **Create backend package**
   - `packages/backend/package.json` with dependencies:
     - `fastify`, `@fastify/cors`
     - `duckdb` (official package)
     - `typescript`, `tsx`, `vitest`
   - `packages/backend/tsconfig.json` extending base config
   - `packages/backend/vitest.config.ts`

3. **Implement DuckDB connection** (`src/db/connection.ts`)
   - Singleton pattern with lazy initialization
   - File-backed database at `data/quack.duckdb`
   - Promise-wrapped query execution helper
   - Graceful shutdown handling

4. **Create metadata schema** (`src/db/schema.ts`)
   - Initialize on first connection:
     ```sql
     CREATE TABLE IF NOT EXISTS _files (
       id TEXT PRIMARY KEY,
       filename TEXT NOT NULL,
       path TEXT NOT NULL,
       uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     
     CREATE TABLE IF NOT EXISTS _tables (
       id TEXT PRIMARY KEY,
       name TEXT NOT NULL UNIQUE,
       source_file_id TEXT REFERENCES _files(id),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     
     CREATE TABLE IF NOT EXISTS _queries (
       id TEXT PRIMARY KEY,
       name TEXT NOT NULL,
       sql TEXT NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     ```

5. **Create Fastify server** (`src/server.ts`)
   - CORS configuration for local development
   - JSON body parser
   - Error handling plugin
   - Health check route: `GET /health`
   - Graceful shutdown

6. **Add tests**
   - Connection initialization test
   - Schema creation test
   - Health endpoint test

### Acceptance Criteria

- `pnpm install` succeeds from root
- `pnpm --filter backend dev` starts server on port 3001
- `GET /health` returns `{ "status": "ok" }`
- `pnpm --filter backend test` passes
- DuckDB file created at `data/quack.duckdb`

---

## PR #2: File Upload + CSV Ingestion

**Branch**: `02-file-upload`  
**Base**: `01-backend-scaffold`  
**Goal**: Enable CSV file uploads and table creation from uploaded files.

### Deliverables

- [ ] File upload endpoint
- [ ] File listing endpoint
- [ ] Table creation from CSV
- [ ] Table listing and preview endpoints
- [ ] Integration tests

### Implementation Steps

1. **Add multipart support**
   - Install `@fastify/multipart`
   - Configure upload limits (50MB default)
   - Create `data/uploads/` directory

2. **Implement file routes** (`src/routes/files.ts`)
   - `POST /files/upload`
     - Accept multipart form data
     - Generate UUID for file ID
     - Save to `data/uploads/{id}_{filename}`
     - Insert metadata into `_files` table
     - Return `{ file_id: string }`
   - `GET /files`
     - Query `_files` table
     - Return array of file metadata

3. **Implement table routes** (`src/routes/tables.ts`)
   - `POST /tables`
     - Accept `{ file_id: string, table_name: string }`
     - Validate table name (alphanumeric + underscore)
     - Execute: `CREATE TABLE {name} AS SELECT * FROM read_csv_auto('{path}')`
     - Insert metadata into `_tables` table
     - Return `{ table_id: string, table_name: string }`
   - `GET /tables`
     - Query `_tables` joined with `_files`
     - Return array with table metadata
   - `GET /tables/:tableName/preview`
     - Accept `?limit=100` query param (max 1000)
     - Execute: `SELECT * FROM {tableName} LIMIT {limit}`
     - Return `{ columns, rows }` format

4. **Add CSV utility** (`src/utils/csv.ts`)
   - Table name validation function
   - Path sanitization

5. **Add tests**
   - File upload with sample CSV
   - Table creation from uploaded file
   - Table preview with limit

### Acceptance Criteria

- CSV file can be uploaded via `POST /files/upload`
- `GET /files` returns uploaded files
- Table can be created from uploaded file
- `GET /tables` shows created tables
- `GET /tables/{name}/preview` returns data
- All tests pass

---

## PR #3: SQL Query Execution Endpoint

**Branch**: `03-query-execution`  
**Base**: `02-file-upload`  
**Goal**: Execute arbitrary SQL and return structured results.

### Deliverables

- [ ] Query execution endpoint
- [ ] Result formatting utility
- [ ] Row limit enforcement
- [ ] OpenAPI specification
- [ ] Error handling tests

### Implementation Steps

1. **Implement query route** (`src/routes/query.ts`)
   - `POST /query/execute`
     - Accept `{ sql: string, limit?: number }`
     - Default limit: 1000, max limit: 10000
     - Wrap SQL with limit: `SELECT * FROM ({sql}) LIMIT {limit}`
     - Execute query with timeout (30s default)
     - Return formatted result

2. **Create result formatter** (`src/utils/query.ts`)
   - Extract column names and types from DuckDB result
   - Format rows as 2D array
   - Return structure:
     ```typescript
     interface QueryResult {
       columns: Array<{ name: string; type: string }>;
       rows: unknown[][];
       truncated: boolean;
       rowCount: number;
     }
     ```

3. **Add error handling**
   - SQL syntax errors → 400 with message
   - Timeout errors → 408 with message
   - Internal errors → 500 with generic message

4. **Create OpenAPI spec** (`openapi.yaml`)
   - Document all endpoints from PRs 1-3
   - Define request/response schemas
   - Add examples

5. **Add tests**
   - Simple SELECT query
   - Query with JOIN
   - Invalid SQL error handling
   - Limit enforcement

### Acceptance Criteria

- `POST /query/execute` executes valid SQL
- Results include column metadata
- Row limit is enforced
- Errors return appropriate status codes
- OpenAPI spec validates
- All tests pass

---

## PR #4: Frontend Scaffold (Vite + React Setup)

**Branch**: `04-frontend-scaffold`  
**Base**: `03-query-execution`  
**Goal**: Establish frontend infrastructure with API client generation.

### Deliverables

- [ ] Vite + React + TypeScript setup
- [ ] Tailwind CSS + shadcn/ui configuration
- [ ] TanStack Router setup
- [ ] TanStack Query provider
- [ ] Generated API client from OpenAPI
- [ ] Build verification

### Implementation Steps

1. **Create frontend package**
   - `packages/frontend/package.json` with dependencies:
     - `react`, `react-dom`
     - `@tanstack/react-router`, `@tanstack/react-query`
     - `tailwindcss`, `postcss`, `autoprefixer`
     - `vite`, `typescript`, `vitest`
   - `packages/frontend/tsconfig.json`
   - `packages/frontend/vite.config.ts` with proxy to backend

2. **Configure Tailwind + shadcn/ui**
   - `tailwind.config.js` with shadcn preset
   - `src/styles/globals.css` with Tailwind directives
   - Initialize shadcn/ui with `components.json`
   - Add initial components: Button, Card, Input

3. **Set up TanStack Router**
   - `src/routes/__root.tsx` - root layout
   - `src/routes/index.tsx` - home redirect
   - `src/routes/explorer.tsx` - data explorer page
   - `src/routes/workspace.tsx` - SQL workspace page
   - `src/routeTree.gen.ts` - generated route tree

4. **Configure TanStack Query**
   - Create QueryClient in `src/lib/query-client.ts`
   - Wrap app in QueryClientProvider
   - Configure default options (stale time, retry)

5. **Generate API client**
   - Add `openapi-typescript-codegen` or `orval` as dev dependency
   - Create generation script in `package.json`
   - Generate to `src/lib/api/`
   - Export typed client

6. **Create app shell** (`src/App.tsx`)
   - Header with navigation
   - Main content area
   - Basic responsive layout

7. **Add tests**
   - App renders without crashing
   - Router navigation works

### Acceptance Criteria

- `pnpm --filter frontend dev` starts on port 5173
- Proxy forwards `/api/*` to backend
- Navigation between routes works
- API client types match OpenAPI spec
- `pnpm --filter frontend build` succeeds
- `pnpm --filter frontend test` passes

---

## PR #5: Data Explorer UI

**Branch**: `05-data-explorer`  
**Base**: `04-frontend-scaffold`  
**Goal**: Build the left panel for browsing files and tables.

### Deliverables

- [ ] File upload component
- [ ] File list display
- [ ] Table list with creation
- [ ] Table preview panel
- [ ] TanStack Query hooks

### Implementation Steps

1. **Create data hooks** (`src/hooks/`)
   - `useFiles.ts` - list files, upload mutation
   - `useTables.ts` - list tables, create mutation, preview query

2. **Build FileUpload component** (`src/components/FileUpload.tsx`)
   - Drag-and-drop zone using shadcn/ui Card
   - File input fallback
   - Upload progress indicator
   - Success/error toast notifications

3. **Build FileList component** (`src/components/FileList.tsx`)
   - List of uploaded files with metadata
   - "Create Table" action for each file
   - Table name input dialog

4. **Build TableList component** (`src/components/TableList.tsx`)
   - List of created tables
   - Click to select for preview
   - Show source file info

5. **Build TablePreview component** (`src/components/TablePreview.tsx`)
   - TanStack Table for data display
   - Column sorting
   - Pagination controls
   - Loading skeleton

6. **Compose explorer page** (`src/routes/explorer.tsx`)
   - Two-column layout
   - Left: FileUpload, FileList, TableList
   - Right: TablePreview

7. **Add tests**
   - File upload flow
   - Table creation flow
   - Preview rendering

### Acceptance Criteria

- Can drag-and-drop CSV file to upload
- Uploaded files appear in list
- Can create table from file
- Tables appear in list
- Clicking table shows preview
- All tests pass

---

## PR #6: SQL Editor and Execution

**Branch**: `06-sql-editor`  
**Base**: `05-data-explorer`  
**Goal**: Add Monaco-based SQL editor with query execution.

### Deliverables

- [ ] Monaco Editor integration
- [ ] SQL cell component
- [ ] Query execution hook
- [ ] Result table display
- [ ] Error display

### Implementation Steps

1. **Integrate Monaco Editor**
   - Install `@monaco-editor/react`
   - Create `SQLEditor.tsx` wrapper component
   - Configure SQL language mode
   - Add basic autocomplete for table names

2. **Create useQueryExecution hook** (`src/hooks/useQuery.ts`)
   - Mutation for `POST /query/execute`
   - Loading state management
   - Error handling
   - Result caching (optional)

3. **Build SQLCell component** (`src/components/SQLCell.tsx`)
   - Monaco editor area (resizable)
   - Run button with loading state
   - Keyboard shortcut: Cmd/Ctrl+Enter
   - Results panel below editor
   - Error display with syntax highlighting

4. **Build ResultTable component** (`src/components/ResultTable.tsx`)
   - TanStack Table for query results
   - Auto-size columns
   - Horizontal scroll for wide results
   - Row count display
   - Truncation warning

5. **Create workspace page** (`src/routes/workspace.tsx`)
   - Single SQL cell for now
   - Full-height layout

6. **Add tests**
   - Editor renders
   - Query execution
   - Result display
   - Error handling

### Acceptance Criteria

- Monaco editor loads with SQL highlighting
- Cmd+Enter executes query
- Results display in table format
- Errors show clear message
- All tests pass

---

## PR #7: Query Persistence

**Branch**: `07-query-persistence`  
**Base**: `06-sql-editor`  
**Goal**: Save and manage SQL cells.

### Deliverables

- [ ] Saved queries API endpoints
- [ ] Save/update UI in SQL cell
- [ ] Saved queries list
- [ ] Load saved query

### Implementation Steps

1. **Implement queries routes** (`src/routes/queries.ts`)
   - `POST /queries` - create saved query
   - `GET /queries` - list saved queries
   - `GET /queries/:id` - get single query
   - `PUT /queries/:id` - update query
   - `DELETE /queries/:id` - delete query

2. **Update OpenAPI spec**
   - Add queries endpoints
   - Regenerate API client

3. **Create useQueries hook** (`src/hooks/useQueries.ts`)
   - List queries
   - Create/update/delete mutations

4. **Update SQLCell component**
   - Add save button
   - Name input field (inline or dialog)
   - Unsaved changes indicator
   - Update existing query

5. **Build SavedQueriesList component** (`src/components/SavedQueriesList.tsx`)
   - List of saved queries with names
   - Last updated timestamp
   - Click to load into editor
   - Delete action

6. **Update workspace page**
   - Add saved queries panel (collapsible sidebar)

7. **Add tests**
   - Create saved query
   - Load saved query
   - Update saved query
   - Delete saved query

### Acceptance Criteria

- Can save current SQL with a name
- Saved queries appear in list
- Can load saved query into editor
- Can update existing saved query
- Can delete saved query
- All tests pass

---

## PR #8: Multi-Cell Workspace

**Branch**: `08-multi-cell`  
**Base**: `07-query-persistence`  
**Goal**: Support multiple independent SQL cells in the workspace.

### Deliverables

- [ ] Multi-cell workspace state
- [ ] Add/remove cell controls
- [ ] Cell reordering
- [ ] Independent execution
- [ ] Local state management

### Implementation Steps

1. **Design cell state**
   ```typescript
   interface CellState {
     id: string;
     sql: string;
     savedQueryId?: string;
     result?: QueryResult;
     error?: string;
     isExecuting: boolean;
     isDirty: boolean;
   }
   ```

2. **Create useCellManager hook** (`src/hooks/useCellManager.ts`)
   - Array of cell states
   - Add cell (at position or end)
   - Remove cell
   - Update cell SQL
   - Reorder cells (drag-and-drop optional)

3. **Update SQLCell component**
   - Accept cell state as prop
   - Add cell controls: delete, move up/down
   - Visual indicator for execution state

4. **Update workspace page**
   - Render array of SQLCell components
   - "Add Cell" button
   - Keyboard navigation between cells

5. **Add keyboard shortcuts**
   - Cmd+Enter: run current cell
   - Cmd+Shift+Enter: run and add new cell
   - Escape: blur editor

6. **Add tests**
   - Add multiple cells
   - Execute cells independently
   - Remove cell
   - Reorder cells

### Acceptance Criteria

- Can add new SQL cells
- Each cell executes independently
- Can remove cells
- Can reorder cells
- Keyboard shortcuts work
- All tests pass

---

## PR #9: Chart Rendering

**Branch**: `09-chart-rendering`  
**Base**: `08-multi-cell`  
**Goal**: Add Vega-Lite visualization for query results.

### Deliverables

- [ ] Vega-Lite integration (lazy loaded)
- [ ] Chart type selector
- [ ] Axis mapping UI
- [ ] Chart toggle in SQL cell
- [ ] Bundle size verification

### Implementation Steps

1. **Install Vega-Lite**
   - Add `vega`, `vega-lite`, `react-vega` as dependencies
   - Create lazy-loaded wrapper

2. **Build ChartConfig component** (`src/components/ChartConfig.tsx`)
   - Chart type selector: bar, line, scatter, area, pie
   - X-axis column selector
   - Y-axis column selector (supports multiple)
   - Color/group by selector
   - Aggregation options

3. **Build ChartViewer component** (`src/components/ChartViewer.tsx`)
   - Generate Vega-Lite spec from config
   - Render chart with react-vega
   - Responsive sizing
   - Export as PNG/SVG

4. **Update SQLCell component**
   - Add "Chart" toggle button
   - Show chart config when toggled
   - Split view: table + chart

5. **Add chart spec generator** (`src/lib/chart-spec.ts`)
   - Map config to Vega-Lite JSON spec
   - Handle different chart types
   - Apply sensible defaults

6. **Add tests**
   - Chart renders with valid data
   - Config changes update chart
   - Different chart types

7. **Verify bundle size**
   - Check production build size
   - Ensure Vega is code-split

### Acceptance Criteria

- Can toggle chart view for query results
- Can select chart type
- Can map columns to axes
- Chart renders correctly
- Vega-Lite lazy loads (not in initial bundle)
- All tests pass

---

## Post-MVP Considerations

Items explicitly out of scope but worth noting for future:

1. **Desktop app wrapper** - Electron or Tauri
2. **Export functionality** - CSV, JSON, Excel
3. **Query history** - Auto-save executed queries
4. **Schema browser** - Show column types in sidebar
5. **Performance** - Virtual scrolling for large results
6. **Themes** - Dark mode support

---

## Technical Decisions to Confirm

Before starting implementation, confirm these choices:

1. **DuckDB package**: `duckdb` (official) recommended
2. **API client generator**: `orval` vs `openapi-typescript-codegen` - orval has better TanStack Query integration
3. **State management**: TanStack Query + local React state sufficient, no Redux/Zustand needed
4. **Monaco bundle**: Use `@monaco-editor/react` with CDN loading to reduce bundle

---

## Getting Started

To begin implementation:

```bash
# Clone and checkout main
git checkout main
git pull

# Create first PR branch
git checkout -b 01-backend-scaffold

# Start implementing PR #1
```

Each PR should be reviewed and merged before the next begins. If changes are needed, rebase dependent branches.
