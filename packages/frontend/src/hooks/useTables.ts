import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface TableMetadata {
  id: string;
  name: string;
  source_file_id: string | null;
  created_at: string;
}

export interface TableColumn {
  name: string;
  type: string;
}

export interface TablePreview {
  columns: TableColumn[];
  rows: unknown[][];
  row_count: number;
}

interface TablesResponse {
  tables: TableMetadata[];
}

interface CreateTableRequest {
  file_id: string;
  table_name: string;
}

interface CreateTableResponse {
  table_id: string;
  table_name: string;
}

async function fetchTables(): Promise<TableMetadata[]> {
  const response = await fetch('/api/tables');
  if (!response.ok) {
    throw new Error('Failed to fetch tables');
  }
  const data: TablesResponse = await response.json();
  return data.tables;
}

async function createTable(request: CreateTableRequest): Promise<CreateTableResponse> {
  const response = await fetch('/api/tables', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create table');
  }

  return response.json();
}

async function fetchTablePreview(tableName: string, limit = 100): Promise<TablePreview> {
  const response = await fetch(
    `/api/tables/${encodeURIComponent(tableName)}/preview?limit=${limit}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch table preview');
  }
  return response.json();
}

export function useTables() {
  return useQuery({
    queryKey: ['tables'],
    queryFn: fetchTables,
  });
}

export function useCreateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

export function useTablePreview(tableName: string | null, limit = 100) {
  return useQuery({
    queryKey: ['tablePreview', tableName, limit],
    queryFn: () => fetchTablePreview(tableName!, limit),
    enabled: !!tableName,
  });
}
