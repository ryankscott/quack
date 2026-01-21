import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface TableColumn {
  name: string;
  type: string;
}

interface TableSchemaResponse {
  columns: TableColumn[];
}

async function fetchTableSchema(tableName: string): Promise<TableColumn[]> {
  const data = await apiClient.get<TableSchemaResponse>(
    `/tables/${encodeURIComponent(tableName)}/schema`
  );
  return data.columns;
}

export function useTableSchema(tableName: string | null) {
  return useQuery({
    queryKey: ['tableSchema', tableName],
    queryFn: () => fetchTableSchema(tableName!),
    enabled: !!tableName,
  });
}
