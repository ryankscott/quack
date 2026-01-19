import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface NotebookCell {
  id: string;
  notebook_id: string;
  cell_index: number;
  cell_type: string;
  sql_text: string | null;
  markdown_text: string | null;
  chart_config: string | null;
  created_at: string;
}

export interface Notebook {
  id: string;
  name: string;
  markdown: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotebookWithCells extends Notebook {
  cells: NotebookCell[];
}

export interface CreateNotebookRequest {
  name: string;
  markdown?: string;
  cells?: Array<{
    cell_type: string;
    sql_text?: string;
    markdown_text?: string;
    chart_config?: string;
  }>;
}

export interface UpdateNotebookRequest {
  name?: string;
  markdown?: string;
  cells?: Array<{
    cell_type: string;
    sql_text?: string;
    markdown_text?: string;
    chart_config?: string;
  }>;
}

export type DataMode = 'none' | 'query-results' | 'referenced-tables' | 'full-db';

export interface ExportRequest {
  dataMode: DataMode;
}

/**
 * Fetch all notebooks
 */
export function useNotebooks() {
  return useQuery({
    queryKey: ['notebooks'],
    queryFn: async (): Promise<Notebook[]> => {
      const data = await apiClient.get<{ notebooks: Notebook[] }>('/notebooks');
      return data.notebooks;
    },
  });
}

/**
 * Fetch a single notebook with cells by ID
 */
export function useNotebook(id: string | null) {
  return useQuery({
    queryKey: ['notebooks', id],
    queryFn: async (): Promise<NotebookWithCells> => {
      if (!id) throw new Error('Notebook ID is required');
      return apiClient.get<NotebookWithCells>(`/notebooks/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Create a new notebook
 */
export function useCreateNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateNotebookRequest): Promise<NotebookWithCells> => {
      return apiClient.post<NotebookWithCells>('/notebooks', request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    },
  });
}

/**
 * Update an existing notebook
 */
export function useUpdateNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      request,
    }: {
      id: string;
      request: UpdateNotebookRequest;
    }): Promise<NotebookWithCells> => {
      return apiClient.put<NotebookWithCells>(`/notebooks/${id}`, request);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      queryClient.invalidateQueries({ queryKey: ['notebooks', variables.id] });
    },
  });
}

/**
 * Delete a notebook
 */
export function useDeleteNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete<void>(`/notebooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    },
  });
}

/**
 * Export a notebook to .quackdb file
 */
export function useExportNotebook() {
  return useMutation({
    mutationFn: async ({
      notebookId,
      dataMode,
    }: {
      notebookId: string;
      dataMode: DataMode;
    }): Promise<Blob> => {
      // Export needs special handling to get blob response
      const url = new URL(`/api/notebooks/${notebookId}/export`, window.location.origin);
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataMode }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export notebook');
      }
      return response.blob();
    },
  });
}

/**
 * Import a notebook from .quackdb file
 */
export function useImportNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<NotebookWithCells> => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.upload<NotebookWithCells>('/notebooks/import', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    },
  });
}
