# Quack

A local-first DuckDB-backed web application for data exploration and SQL-based analytics.

## Project Structure

```
quack/
├── packages/
│   └── backend/          # Fastify + DuckDB backend
│       ├── src/
│       │   ├── server.ts
│       │   └── db/
│       │       ├── connection.ts
│       │       └── schema.ts
│       └── tests/
├── data/                 # DuckDB database files
└── plans/               # Implementation planning docs
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 8

### Installation

```bash
pnpm install
```

### Development

Start the backend server:

```bash
pnpm --filter backend dev
```

The server will start on `http://localhost:3001`.

### Testing

Run all tests:

```bash
pnpm test
```

Run backend tests only:

```bash
pnpm --filter backend test
```

## API Endpoints

### Health Check

```
GET /health
```

Returns server status.

## PR #1 Status: ✅ Complete

### Completed Deliverables

- [x] pnpm workspace configuration
- [x] Backend package with Fastify server
- [x] DuckDB connection singleton
- [x] Metadata schema initialization (_files, _tables, _queries)
- [x] Health check endpoint
- [x] Test infrastructure with Vitest
- [x] All tests passing (8/8)

### Verification

```bash
# Install dependencies
pnpm install

# Run tests
pnpm --filter backend test
# Expected: All tests pass

# Start dev server
pnpm --filter backend dev
# Expected: Server listening on http://0.0.0.0:3001

# Test health endpoint (in another terminal)
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"..."}
```

## Next Steps

See [plans/implementation.md](plans/implementation.md) for the complete roadmap.

Next PR: **#2 - File Upload + CSV Ingestion**
