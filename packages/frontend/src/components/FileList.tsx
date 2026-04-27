import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowDownToLine, Trash2 } from 'lucide-react';
import { useDeleteFile, useFiles, type FileMetadata } from '@/hooks/useFiles';
import { ImportDialog } from './ImportDialog';
import { Button } from './ui/button';
import { LoadingState, ErrorState } from './ui/loading-error';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface FileListProps {
  onTableCreated?: (tableName: string) => void;
}

export function FileList({ onTableCreated }: FileListProps) {
  const { data: files, isLoading, error } = useFiles();
  const deleteFileMutation = useDeleteFile();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileMetadata | null>(null);

  const handleCreateTable = (fileId: string) => {
    setSelectedFileId(fileId);
    setDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) {
      return;
    }

    try {
      await deleteFileMutation.mutateAsync(fileToDelete.id);
      toast.success('CSV deleted successfully');
      setFileToDelete(null);
    } catch (mutationError) {
      toast.error(`Failed to delete CSV: ${(mutationError as Error).message}`);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading files..." />;
  }

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
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-quack-dark truncate">{file.filename}</div>
                <div className="text-xs text-quack-dark text-opacity-60">
                  {new Date(file.uploaded_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleCreateTable(file.id)}
                  size="icon"
                  variant="outline"
                  title="Import to table"
                  aria-label={`Import ${file.filename} to a table`}
                >
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setFileToDelete(file)}
                  size="icon"
                  variant="outline"
                  title="Delete CSV"
                  aria-label={`Delete ${file.filename}`}
                  disabled={deleteFileMutation.isPending && fileToDelete?.id === file.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
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

      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CSV?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the uploaded CSV from Quack. Tables already created from it will stay in place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
