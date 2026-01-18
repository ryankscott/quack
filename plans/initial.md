# Project: DuckDB-Backed Local BI Workspace (TypeScript Backend)

## 1. High-level goal

Build a **local-first web application** that provides:

* A DuckDB-backed data workspace
* CSV upload → persistent DuckDB tables
* SQL cells that execute independently (DuckDB UI–style)
* Tabular and basic chart outputs
* Saved SQL cells
* No Jupyter or Python kernel support

The application runs as:

* A web app
* Optionally wrapped as a desktop app later (Electron or Tauri)

---

## 2. Non-goals (explicit exclusions)

Do NOT implement:

* Jupyter notebooks or kernels
* Python or R execution
* User authentication or roles
* Dashboards, filters, or semantic layers
* DBT or model orchestration

SQL is the only computation language.

---

## 3. Technology constraints (hard requirements)

### Backend

* Language: **TypeScript**
* Runtime: **Node.js**
* Framework: **Fastify** (preferred) or Express
* Database engine: **DuckDB (node-duckdb)**
* API contract: **OpenAPI 3.1**
* Metadata storage: SQLite or DuckDB metadata schema
* File storage: Local filesystem

### Frontend

* Framework: **React**
* Language: **TypeScript**
* Build: **Vite**
* Data fetching: **TanStack Query**
* Tables: **TanStack Table**
* Charts: **Vega-Lite**
* SQL editor: **Monaco Editor**

---

## 4. Conceptual model

### Workspace

A workspace consists of:

* One DuckDB database file
* Uploaded source files (CSV)
* Tables created from those files
* Saved SQL cells

Assumptions:

* Single workspace
* Single user
* Local filesystem persistence

---

## 5. Backend architecture

### Responsibilities

* Manage DuckDB connection lifecycle
* Handle file uploads
* Create DuckDB tables from CSV files
* Execute SQL queries
* Return structured query results
* Persist metadata (files, tables, saved queries)

### DuckDB usage rules

* One DuckDB connection per workspace
* Serialize write queries
* Prefer `read_csv_auto()` for ingestion
* Enforce result row limits

---

## 6. Metadata schema (example)

Stored in SQLite or DuckDB itself.

```
files
- id TEXT PRIMARY KEY
- filename TEXT
- path TEXT
- uploaded_at DATETIME

tables
- id TEXT PRIMARY KEY
- name TEXT
- source_file_id TEXT
- created_at DATETIME

queries
- id TEXT PRIMARY KEY
- name TEXT
- sql TEXT
- created_at DATETIME
- updated_at DATETIME
```

---

## 7. OpenAPI contract (authoritative)

### Upload CSV

```
POST /files/upload
Content-Type: multipart/form-data

Response:
{
  "file_id": string
}
```

---

### List files

```
GET /files
```

---

### Create table from file

```
POST /tables
{
  "file_id": string,
  "table_name": string
}
```

---

### List tables

```
GET /tables
```

---

### Table preview

```
GET /tables/{table_name}/preview?limit=100
```

---

### Execute SQL

```
POST /query/execute
{
  "sql": string,
  "limit": number
}
```

Response:

```
{
  "columns": [{ "name": string, "type": string }],
  "rows": any[][]
}
```

---

### Save SQL cell

```
POST /queries
{
  "name": string,
  "sql": string
}
```

---

### List saved SQL cells

```
GET /queries
```

---

### Update saved SQL cell

```
PUT /queries/{id}
{
  "name": string,
  "sql": string
}
```

---

## 8. Backend implementation notes (important for LLM)

### DuckDB in Node

* Use `duckdb.Database` with a file-backed database
* Create a single shared connection
* Wrap query execution in Promises
* Normalize results into `{ columns, rows }`

### CSV ingestion pattern

```sql
CREATE TABLE my_table AS
SELECT * FROM read_csv_auto('/data/uploads/foo.csv');
```

Avoid copying data twice.

---

## 9. Frontend structure

### Core panels

#### Data explorer

* Uploaded files
* Tables
* Table preview

#### SQL workspace

* Vertical list of SQL cells
* Each cell:

  * SQL editor
  * Run button
  * Results panel
  * Optional chart toggle
  * Save button

Cells are independent and stateless.

---

## 10. SQL cell behavior

* Each cell executes in isolation
* No execution order or shared state
* No variable passing
* SQL is the sole interface

This is intentionally **not a notebook runtime**.

---

## 11. Frontend data flow

* Generate API client from OpenAPI
* All data access via TanStack Query
* No global mutable state
* Server is source of truth

---

## 12. Build phases (LLM execution plan)

### Phase 1: Backend foundation

* Fastify server
* DuckDB connection setup
* File upload handling
* CSV → table ingestion
* Table listing

### Phase 2: Query execution

* SQL execution endpoint
* Result formatting
* Row limit enforcement

### Phase 3: Frontend scaffold

* Vite + React + TypeScript
* OpenAPI client generation
* App shell

### Phase 4: Data exploration UI

* Table list
* Table preview
* SQL editor
* Result table

### Phase 5: SQL cells

* Multiple independent SQL cells
* Save and load queries

### Phase 6: Visualization

* Chart from query result
* Manual axis mapping

---

## 13. Quality constraints

* No hidden computation
* SQL remains explicit
* DuckDB is visible, not abstracted
* Prefer simplicity over extensibility

---

## 14. Completion criteria

The project is complete when:

* CSV files can be uploaded
* Tables are created in DuckDB
* SQL queries can be executed
* Results render as tables or charts
* SQL cells can be saved and rerun
* No notebook or kernel infrastructure exists

