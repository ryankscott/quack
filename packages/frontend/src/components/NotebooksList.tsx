import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNotebooks, useDeleteNotebook, useCreateNotebook, type Notebook } from '../hooks/useNotebooks';
import { LoadingState, ErrorState } from './ui/loading-error';
import { Button } from './ui/button';
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

interface NotebooksListProps {
  currentNotebookId: string | null;
  onSelectNotebook: (notebook: Notebook) => void;
  onCreateNotebook: () => void;
}

export function NotebooksList({ currentNotebookId, onSelectNotebook, onCreateNotebook }: NotebooksListProps) {
  const { data: notebooks, isLoading, error } = useNotebooks();
  const deleteNotebookMutation = useDeleteNotebook();
  const createNotebookMutation = useCreateNotebook();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotebookToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!notebookToDelete) return;

    try {
      await deleteNotebookMutation.mutateAsync(notebookToDelete);
      toast.success('Notebook deleted successfully');
    } catch (error) {
      toast.error(`Failed to delete notebook: ${(error as Error).message}`);
    } finally {
      setDeleteDialogOpen(false);
      setNotebookToDelete(null);
    }
  };

  const handleCreateNew = async () => {
    const newNotebook = await createNotebookMutation.mutateAsync({
      name: 'Untitled',
      cells: [],
    });
    onSelectNotebook(newNotebook);
    onCreateNotebook();
  };

  if (isLoading) {
    return <LoadingState message="Loading notebooks..." />;
  }

  if (error) {
    return <ErrorState error={error} title="Failed to load notebooks" />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-quack-dark border-opacity-10">
        <Button
          onClick={handleCreateNew}
          variant="default"
          size="sm"
          className="w-full flex items-center gap-2"
          disabled={createNotebookMutation.isPending}
        >
          <Plus size={16} />
          {createNotebookMutation.isPending ? 'Creating...' : 'New Notebook'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!notebooks || notebooks.length === 0 ? (
          <div className="p-4 text-quack-dark text-opacity-60 text-sm">
            No notebooks yet. Create your first notebook to get started.
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-4">
            {notebooks.map((notebook) => (
              <div
                key={notebook.id}
                className={`border rounded-lg p-3 hover:bg-quack-gold hover:bg-opacity-5 cursor-pointer group transition-colors ${currentNotebookId === notebook.id
                    ? 'border-quack-orange bg-quack-gold bg-opacity-10'
                    : 'border-quack-dark border-opacity-10'
                  }`}
                onClick={() => onSelectNotebook(notebook)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate text-quack-dark">{notebook.name}</h3>
                    <p className="text-xs text-quack-dark text-opacity-40 mt-1">
                      Updated {new Date(notebook.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(notebook.id, e)}
                    className="ml-2 text-quack-dark text-opacity-40 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete notebook"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notebook?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the notebook and all its cells.
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
