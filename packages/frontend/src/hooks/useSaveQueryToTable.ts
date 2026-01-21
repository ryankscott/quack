import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface SaveToTableRequest {
  sql: string;
  table_name: string;
  description?: string;
  allowed_tables?: string[];
}

interface SaveToTableResponse {
  table_name: string;
  row_count: number;
}

async function saveQueryToTable(request: SaveToTableRequest): Promise<SaveToTableResponse> {
  return apiClient.post<SaveToTableResponse>('/query/save-to-table', request);
}

export function useSaveQueryToTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveQueryToTable,
    onSuccess: () => {
      // Invalidate tables list to reflect the new table
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}
