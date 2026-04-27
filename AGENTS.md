# agents.md

## Project

Quack - A local-first DuckDB-backed web application for data exploration and SQL-based analytics.

**Vision**: Enable users to upload CSV files, query them with SQL, and visualize results in a modern web UI without any notebook kernel infrastructure.

## Definitions

- **Problem**: Users need a lightweight, local BI tool that lets them upload data and run SQL queries with instant results.
- **Value**: A standalone web app that runs entirely client-side (with local backend), supports SQL execution against DuckDB, and provides tabular and chart outputs.
- **Architecture**: TypeScript monorepo with separate backend (Fastify + DuckDB) and frontend (React + Vite).

## Tech Stack

### Backend
- **Language**: TypeScript
- **Runtime**: Node.js
- **Framework**: Fastify
- **Database**: DuckDB (via node-duckdb)
- **Package Manager**: pnpm

### Frontend
- **Language**: TypeScript
- **Framework**: React
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Table Management**: TanStack Table
- **Routing**: TanStack Router
- **Data Fetching**: TanStack Query
- **Testing**: Vitest

## Development Workflow

### Code Quality Standards

- **Type Safety**: Strict TypeScript, no `any`
- **Testing**: Unit tests via Vitest for all business logic
- **Linting**: ESLint + Prettier for consistency
- **Documentation**: OpenAPI schema is source of truth for API contracts
- **Performance**: Monitor bundle size; lazy-load chart library


## Directory Structure (Proposed)

```
quack/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── db/
│   │   │   │   ├── connection.ts
│   │   │   │   └── schema.ts
│   │   │   ├── routes/
│   │   │   │   ├── files.ts
│   │   │   │   ├── tables.ts
│   │   │   │   ├── query.ts
│   │   │   │   └── queries.ts
│   │   │   └── utils/
│   │   │       └── csv.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   └── frontend/
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── routes/
│       │   │   ├── data.tsx
│       │   │   └── notebooks.tsx
│       │   ├── components/
│       │   │   ├── FileUpload.tsx
│       │   │   ├── TableList.tsx
│       │   │   ├── SQLCell.tsx
│       │   │   └── ChartViewer.tsx
│       │   ├── hooks/
│       │   │   ├── useFiles.ts
│       │   │   ├── useTables.ts
│       │   │   └── useQuery.ts
│       │   ├── lib/
│       │   │   └── api-client.ts (auto-generated)
│       │   └── styles/
│       │       └── globals.css
│       ├── tests/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── vitest.config.ts
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── plans/
│   ├── initial.md
│   └── agents.md
└── README.md
```

## Coding standards
### General
- Always create a plan first; save it to the /plans/ directory for future reference.
- Prefer using libraries rather than implementing from scratch
- Write clear, concise, and maintainable code
- Always run `pnpm test` after modifying JavaScript files.
- Prefer `pnpm` when installing dependencies.
- Ask for confirmation before adding new production dependencies. This does not include new shadcn components. 
- Document public utilities in `docs/` when you change behavior.
- Write tests before all business logic. Ask the user to validate the test functionality before writing the implementation. 
- Follow an API first approach. Update the OpenAPI spec before implementing any backend routes.

### Frontend
- Always use TanStack Query for data fetching
- Use shadcn/ui components for consistent styling
- Keep components small and focused
- Use React hooks for state management
- Always use TypeScript types generated from OpenAPI for API interactions
- Prefer functional components and React best practices
- Use lucide-react for icons
- Prefer icon-only lucide-react buttons for compact import actions in dense lists or toolbars

### Backend 
   

## Testing Strategy

- **Unit**: Vitest for backend utilities (CSV parsing, query formatting)
- **Integration**: Backend route tests with in-memory DuckDB
- **E2E**: Frontend component tests; optional Playwright for full flows
- **Coverage Target**: 70%+ for backend, 50%+ for frontend

## Notes for Agents

- **Collaboration**: Each PR should be independent and mergeable before the next begins.
- **Validation**: Test the entire feature end-to-end before marking complete.
- **Documentation**: Keep OpenAPI spec current; use it as the single source of truth for API contracts.
- **Performance**: Avoid N+1 queries; batch metadata reads where possible.
- **Error Handling**: Provide meaningful error messages from backend; handle gracefully on frontend.
- **Type Generation**: Auto-generate TypeScript types from OpenAPI for frontend API client.
