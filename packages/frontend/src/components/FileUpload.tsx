import { useCallback, useState } from 'react';
import { useUploadFile } from '@/hooks/useFiles';
import { ImportDialog } from './ImportDialog';

interface FileUploadProps {
  onUploadSuccess?: (fileId: string) => void;
  onTableCreated?: (tableName: string) => void;
}

export function FileUpload({ onUploadSuccess, onTableCreated }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const uploadMutation = useUploadFile();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && files[0]) {
        const file = files[0];
        uploadMutation.mutate(file, {
          onSuccess: (fileId) => {
            setUploadedFileId(fileId);
            setDialogOpen(true);
            onUploadSuccess?.(fileId);
          },
        });
      }
    },
    [uploadMutation, onUploadSuccess]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0 && files[0]) {
        const file = files[0];
        uploadMutation.mutate(file, {
          onSuccess: (fileId) => {
            setUploadedFileId(fileId);
            setDialogOpen(true);
            onUploadSuccess?.(fileId);
          },
        });
      }
    },
    [uploadMutation, onUploadSuccess]
  );

  return (
    <div className="p-4 border-b border-quack-dark border-opacity-10">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragging ? 'border-quack-orange bg-quack-yellow_bg' : 'border-quack-dark border-opacity-30 hover:border-opacity-50'}
          ${uploadMutation.isPending ? 'opacity-50 cursor-wait' : ''}
        `}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileInput}
          disabled={uploadMutation.isPending}
          accept=".csv"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          {uploadMutation.isPending ? (
            <div>
              <div className="text-quack-dark text-opacity-70">Uploading...</div>
              <div className="mt-2 text-sm text-quack-dark text-opacity-50">Please wait</div>
            </div>
          ) : (
            <div>
              <div className="text-quack-dark text-opacity-70">
                {isDragging ? 'Drop your file here' : 'Drag and drop a CSV file'}
              </div>
              <div className="mt-2 text-sm text-quack-dark text-opacity-50">or click to browse</div>
            </div>
          )}
        </label>
      </div>
      {uploadMutation.isError && (
        <div className="mt-2 text-sm text-red-600">Error: {uploadMutation.error.message}</div>
      )}
      {uploadMutation.isSuccess && (
        <div className="mt-2 text-sm text-green-600">File uploaded successfully!</div>
      )}
      {uploadedFileId && (
        <ImportDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          fileId={uploadedFileId}
          onSuccess={(tableName) => {
            setUploadedFileId(null);
            onTableCreated?.(tableName);
          }}
        />
      )}
    </div>
  );
}
