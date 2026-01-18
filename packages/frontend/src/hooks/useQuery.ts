import { useMutation } from '@tanstack/react-query';

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

interface QueryExecuteRequest {
  sql: string;
  limit?: number;
}

interface QueryExecuteResponse {
  result: QueryResult;
}

async function executeQuery(request: QueryExecuteRequest): Promise<QueryResult> {
  const response = await fetch('/api/query/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to execute query');
  }

  const data: QueryExecuteResponse = await response.json();
  return data.result;
}

export function useQueryExecution() {
  return useMutation({
    mutationFn: executeQuery,
  });
}
