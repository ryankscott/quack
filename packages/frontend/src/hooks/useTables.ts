import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

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
  mode?: 'create' | 'append';
  target_table?: string;
}

interface CreateTableResponse {
  table_id: string;
  table_name: string;
}

async function fetchTables(): Promise<TableMetadata[]> {
  const data = await apiClient.get<TablesResponse>('/tables');
  return data.tables;
}

async function createTable(request: CreateTableRequest): Promise<CreateTableResponse> {
  return apiClient.post<CreateTableResponse>('/tables', request);
}

async function fetchTablePreview(tableName: string, limit = 100): Promise<TablePreview> {
  return apiClient.get<TablePreview>(`/tables/${encodeURIComponent(tableName)}/preview`, {
    params: { limit },
  });
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
