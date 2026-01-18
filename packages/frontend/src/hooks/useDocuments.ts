import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface DocumentCell {
  id: string;
  document_id: string;
  cell_index: number;
  cell_type: string;
  sql_text: string | null;
  markdown_text: string | null;
  chart_config: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  name: string;
  markdown: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentWithCells extends Document {
  cells: DocumentCell[];
}

export interface CreateDocumentRequest {
  name: string;
  markdown?: string;
  cells?: Array<{
    cell_type: string;
    sql_text?: string;
    markdown_text?: string;
    chart_config?: string;
  }>;
}

export interface UpdateDocumentRequest {
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
 * Fetch all documents
 */
export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async (): Promise<Document[]> => {
      const data = await apiClient.get<{ documents: Document[] }>('/documents');
      return data.documents;
    },
  });
}

/**
 * Fetch a single document with cells by ID
 */
export function useDocument(id: string | null) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: async (): Promise<DocumentWithCells> => {
      if (!id) throw new Error('Document ID is required');
      return apiClient.get<DocumentWithCells>(`/documents/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Create a new document
 */
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateDocumentRequest): Promise<DocumentWithCells> => {
      return apiClient.post<DocumentWithCells>('/documents', request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/**
 * Update an existing document
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      request,
    }: {
      id: string;
      request: UpdateDocumentRequest;
    }): Promise<DocumentWithCells> => {
      return apiClient.put<DocumentWithCells>(`/documents/${id}`, request);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', variables.id] });
    },
  });
}

/**
 * Delete a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete<void>(`/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/**
 * Export a document to .quackdb file
 */
export function useExportDocument() {
  return useMutation({
    mutationFn: async ({
      documentId,
      dataMode,
    }: {
      documentId: string;
      dataMode: DataMode;
    }): Promise<Blob> => {
      // Export needs special handling to get blob response
      const url = new URL(`/api/documents/${documentId}/export`, window.location.origin);
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataMode }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export document');
      }
      return response.blob();
    },
  });
}

/**
 * Import a document from .quackdb file
 */
export function useImportDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<DocumentWithCells> => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.upload<DocumentWithCells>('/documents/import', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
