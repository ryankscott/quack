import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

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
  allowed_tables?: string[];
}

interface QueryExecuteResponse {
  result: QueryResult;
}

async function executeQuery(request: QueryExecuteRequest): Promise<QueryResult> {
  const data = await apiClient.post<QueryExecuteResponse>('/query/execute', request);
  return data.result;
}

export function useQueryExecution() {
  return useMutation({
    mutationFn: executeQuery,
  });
}
