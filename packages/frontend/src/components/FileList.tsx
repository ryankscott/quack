import { useState } from 'react';
import { useFiles } from '@/hooks/useFiles';
import { useCreateTable } from '@/hooks/useTables';
import { LoadingState, ErrorState } from './ui/loading-error';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface FileListProps {
  onTableCreated?: (tableName: string) => void;
}

export function FileList({ onTableCreated }: FileListProps) {
  const { data: files, isLoading, error } = useFiles();
  const createTableMutation = useCreateTable();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [tableName, setTableName] = useState('');

  const handleCreateTable = (fileId: string) => {
    setSelectedFileId(fileId);
    setTableName('');
  };

  const handleSubmit = () => {
    if (!selectedFileId || !tableName.trim()) return;

    createTableMutation.mutate(
      {
        file_id: selectedFileId,
        table_name: tableName.trim(),
      },
      {
        onSuccess: (data) => {
          setSelectedFileId(null);
          setTableName('');
          onTableCreated?.(data.table_name);
        },
      }
    );
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
                disabled={createTableMutation.isPending}
                size="sm"
                variant="default"
              >
                Create Table
              </Button>
            </div>

            {selectedFileId === file.id && (
              <div className="mt-3 pt-3 border-t border-quack-dark border-opacity-10">
                <Input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Enter table name (e.g., my_data)"
                  disabled={createTableMutation.isPending}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={!tableName.trim() || createTableMutation.isPending}
                    size="sm"
                  >
                    {createTableMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                  <Button
                    onClick={() => setSelectedFileId(null)}
                    disabled={createTableMutation.isPending}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
                {createTableMutation.isError && (
                  <div className="mt-2 text-xs text-red-600">
                    {createTableMutation.error.message}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
