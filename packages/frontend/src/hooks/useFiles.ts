import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  const response = await fetch('/api/files');
  if (!response.ok) {
    throw new Error('Failed to fetch files');
  }
  const data: FilesResponse = await response.json();
  return data.files;
}

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  const data: UploadResponse = await response.json();
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
