import { useState } from 'react';
import { useFiles } from '@/hooks/useFiles';
import { LoadingState, ErrorState } from './ui/loading-error';
import { Button } from './ui/button';
import { ImportDialog } from './ImportDialog';

interface FileListProps {
  onTableCreated?: (tableName: string) => void;
}

export function FileList({ onTableCreated }: FileListProps) {
  const { data: files, isLoading, error } = useFiles();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateTable = (fileId: string) => {
    setSelectedFileId(fileId);
    setDialogOpen(true);
  };

  if (isLoading) {
    return <LoadingState message="Loading files..." />;
  }

  console.log('FileList error:', error);

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!files || files.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm text-quack-dark text-opacity-60">No files uploaded yet</div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-quack-dark border-opacity-10">
      <h3 className="text-sm font-semibold text-quack-dark mb-3">Uploaded Files</h3>
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="p-3 bg-quack-gold bg-opacity-5 rounded border border-quack-dark border-opacity-10 hover:bg-opacity-10"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-quack-dark truncate">{file.filename}</div>
                <div className="text-xs text-quack-dark text-opacity-60">
                  {new Date(file.uploaded_at).toLocaleString()}
                </div>
              </div>
              <Button
                onClick={() => handleCreateTable(file.id)}
                size="sm"
                variant="default"
              >
                Import to Table
              </Button>
            </div>
          </div>
        ))}
      </div>
      {selectedFileId && (
        <ImportDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedFileId(null);
            }
          }}
          fileId={selectedFileId}
          onSuccess={(tableName) => {
            setSelectedFileId(null);
            onTableCreated?.(tableName);
          }}
        />
      )}
    </div>
  );
}
