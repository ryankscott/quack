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

async function fetchFiles(): Promise<FileMetadata[]> {
  const data = await apiClient.get<FilesResponse>('/files');
  return data.files;
}

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const data = await apiClient.upload<UploadResponse>('/files/upload', formData);
  return data.file_id;
}

export function useFiles() {
  return useQuery({
    queryKey: ['files'],
    queryFn: fetchFiles,
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
