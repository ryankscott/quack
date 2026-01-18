export interface QueryResultColumn {
  name: string;
  type: string;
}

export interface QueryResult {
  columns: QueryResultColumn[];
  rows: unknown[][];
  truncated: boolean;
  rowCount: number;
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  return value;
}

function inferType(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (value instanceof Date) {
    return 'datetime';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  const type = typeof value;

  if (type === 'number') {
    return Number.isInteger(value as number) ? 'integer' : 'number';
  }

  if (type === 'bigint') {
    return 'bigint';
  }

  if (type === 'boolean') {
    return 'boolean';
  }

  if (type === 'string') {
    return 'string';
  }

  return 'object';
}

export function formatQueryResult(
  rows: Record<string, unknown>[],
  limit: number,
  totalRowCount?: number
): QueryResult {
  if (rows.length === 0) {
    return { columns: [], rows: [], truncated: false, rowCount: 0 };
  }

  const columns = Object.keys(rows[0]!).map((name) => {
    const sampleValue = rows.find((row) => row[name] !== undefined && row[name] !== null)?.[name];
    return {
      name,
      type: inferType(sampleValue),
    } satisfies QueryResultColumn;
  });

  const formattedRows = rows.map((row) => columns.map((col) => normalizeValue(row[col.name])));
  const rowCount = totalRowCount ?? rows.length;
  const truncated = rowCount > rows.length || rows.length >= limit;

  return {
    columns,
    rows: formattedRows,
    truncated,
    rowCount,
  };
}

/**
 * Extract table names from SQL query
 * Returns a set of table names found in FROM and JOIN clauses
 */
export function extractTableNamesFromSQL(sql: string): Set<string> {
  const tableNames = new Set<string>();

  // Simple regex to find FROM and JOIN table references
  // This is a heuristic and may not catch all cases (e.g., subqueries, CTEs)
  const fromMatch = sql.matchAll(/\bFROM\s+(\w+)/gi);
  const joinMatch = sql.matchAll(/\bJOIN\s+(\w+)/gi);

  for (const match of fromMatch) {
    const tableName = match[1];
    if (tableName) {
      tableNames.add(tableName.toLowerCase());
    }
  }

  for (const match of joinMatch) {
    const tableName = match[1];
    if (tableName) {
      tableNames.add(tableName.toLowerCase());
    }
  }

  return tableNames;
}
