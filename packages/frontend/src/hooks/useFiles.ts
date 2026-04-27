import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface FileMetadata {
  id: string;
  filename: string;
  path: string;
  uploaded_at: string;
}

interface FilesResponse {
  files: FileMetadata[];
}

interface UploadResponse {
  file_id: string;
}

export interface FileColumn {
  name: string;
  type: string;
}

interface FileSchemaResponse {
  columns: FileColumn[];
  preview_rows: unknown[][];
}

async function fetchFiles(): Promise<FileMetadata[]> {
  const data = await apiClient.get<FilesResponse>('/files');
  return data.files;
}

async function fetchFileSchema(fileId: string): Promise<FileSchemaResponse> {
  return apiClient.get<FileSchemaResponse>(`/files/${encodeURIComponent(fileId)}/schema`);
}

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const data = await apiClient.upload<UploadResponse>('/files/upload', formData);
  return data.file_id;
}

async function deleteFile(fileId: string): Promise<void> {
  await apiClient.delete<{ success: boolean }>(`/files/${encodeURIComponent(fileId)}`);
}

export function useFiles() {
  return useQuery({
    queryKey: ['files'],
    queryFn: fetchFiles,
  });
}

export function useFileSchema(fileId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['fileSchema', fileId],
    queryFn: () => fetchFileSchema(fileId!),
    enabled: enabled && !!fileId,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}
