import { useState } from 'react';
import { NotebookText, Plus, Trash2 } from 'lucide-react';
import { useNotebooks, useCreateNotebook, type Notebook } from '../hooks/useNotebooks';
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
import { cn } from '@/lib/utils';

interface NotebooksListProps {
  currentNotebookId: string | null;
  onSelectNotebook: (notebook: Notebook) => void;
  onCreateNotebook: () => void;
  onDeleteNotebook: (notebookId: string) => Promise<void>;
  collapsed?: boolean;
}

export function NotebooksList({
  currentNotebookId,
  onSelectNotebook,
  onCreateNotebook,
  onDeleteNotebook,
  collapsed = false,
}: NotebooksListProps) {
  const { data: notebooks, isLoading, error } = useNotebooks();
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
      await onDeleteNotebook(notebookToDelete);
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

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-2 p-2">
        <Button
          onClick={handleCreateNew}
          variant="ghost"
          size="icon"
          title={createNotebookMutation.isPending ? 'Creating notebook...' : 'New notebook'}
          disabled={createNotebookMutation.isPending}
        >
          <Plus size={16} />
          <span className="sr-only">New notebook</span>
        </Button>
        <div className="flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto pt-2">
          {notebooks?.map((notebook) => (
            <button
              key={notebook.id}
              onClick={() => onSelectNotebook(notebook)}
              title={notebook.name}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors',
                currentNotebookId === notebook.id
                  ? 'border-quack-orange bg-quack-gold_bg text-quack-dark'
                  : 'border-quack-dark border-opacity-10 text-quack-dark text-opacity-70 hover:bg-quack-gold hover:bg-opacity-10'
              )}
            >
              {notebook.name.trim().charAt(0).toUpperCase() || <NotebookText size={16} />}
            </button>
          ))}
        </div>
      </div>
    );
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
