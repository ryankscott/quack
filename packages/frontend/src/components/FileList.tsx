import { useState } from 'react';
import { useFiles } from '@/hooks/useFiles';
import { useCreateTable } from '@/hooks/useTables';

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
    return (
      <div className="p-4">
        <div className="text-sm text-quack-dark text-opacity-60">Loading files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-600">Error: {error.message}</div>
      </div>
    );
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
              <button
                onClick={() => handleCreateTable(file.id)}
                className="ml-2 text-xs px-2 py-1 bg-quack-orange text-white rounded hover:bg-opacity-90 disabled:opacity-50"
                disabled={createTableMutation.isPending}
              >
                Create Table
              </button>
            </div>

            {selectedFileId === file.id && (
              <div className="mt-3 pt-3 border-t border-quack-dark border-opacity-10">
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Enter table name (e.g., my_data)"
                  className="input-base w-full"
                  disabled={createTableMutation.isPending}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!tableName.trim() || createTableMutation.isPending}
                    className="text-xs px-3 py-1 bg-quack-orange text-white rounded hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createTableMutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => setSelectedFileId(null)}
                    disabled={createTableMutation.isPending}
                    className="text-xs px-3 py-1 bg-quack-dark bg-opacity-10 text-quack-dark rounded hover:bg-opacity-20"
                  >
                    Cancel
                  </button>
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
