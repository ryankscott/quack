import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { TableColumn } from './useTableSchema';

interface TableSchemaResponse {
  columns: TableColumn[];
}

async function fetchTableSchema(tableName: string): Promise<TableColumn[]> {
  const data = await apiClient.get<TableSchemaResponse>(
    `/tables/${encodeURIComponent(tableName)}/schema`
  );
  return data.columns;
}

/**
 * Hook to fetch schemas for multiple tables in parallel.
 * Returns a map of table names to their column schemas.
 */
export function useTableSchemas(tableNames: string[]) {
  const queries = useQueries({
    queries: tableNames.map((tableName) => ({
      queryKey: ['tableSchema', tableName],
      queryFn: () => fetchTableSchema(tableName),
      enabled: !!tableName,
    })),
  });

  // Combine results into a map
  const columnsByTable: Record<string, TableColumn[]> = {};
  let isLoading = false;
  let hasError = false;

  queries.forEach((query, index) => {
    const tableName = tableNames[index]!;
    if (query.isLoading) {
      isLoading = true;
    }
    if (query.error) {
      hasError = true;
    }
    if (query.data) {
      columnsByTable[tableName] = query.data;
    }
  });

  return {
    data: columnsByTable,
    isLoading,
    hasError,
  };
}
