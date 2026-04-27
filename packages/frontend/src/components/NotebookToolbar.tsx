import { useState } from 'react';
import { DatabaseZap, MoreHorizontal, NotebookText, Save, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
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

interface NotebookToolbarProps {
  documentName: string;
  documentId: string | null;
  mode: 'edit' | 'preview';
  isSaving: boolean;
  isDeleting: boolean;
  onDocumentNameChange: (name: string) => void;
  onSave: () => void;
  onDelete: () => Promise<void>;
  onModeChange: (mode: 'edit' | 'preview') => void;
  onAddMarkdown: () => void;
  onAddSQL: () => void;
}

/**
 * Toolbar section for notebook controls and mode switching
 */
export function NotebookToolbar({
  documentName,
  documentId,
  mode,
  isSaving,
  isDeleting,
  onDocumentNameChange,
  onSave,
  onDelete,
  onModeChange,
  onAddMarkdown,
  onAddSQL,
}: NotebookToolbarProps) {
  const isPreviewMode = mode === 'preview';
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const commitDocumentName = () => {
    if (!documentId || isSaving) return;
    onSave();
  };

  const handleConfirmDelete = async () => {
    await onDelete();
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <div className="border-b border-quack-dark border-opacity-10 bg-white p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0 flex-1">
              <Input
                value={documentName}
                onChange={(e) => onDocumentNameChange(e.target.value)}
                onBlur={commitDocumentName}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
                placeholder="Untitled notebook"
                className="h-10 border-transparent bg-transparent px-2 text-lg font-semibold shadow-none focus-visible:border-border focus-visible:ring-0"
              />
            </div>
            {isSaving && <span className="text-sm text-quack-dark text-opacity-60">Saving...</span>}
          </div>

          <Tabs value={mode} onValueChange={(value) => onModeChange(value as 'edit' | 'preview')}>
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </Tabs>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Notebook options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onSave} disabled={!documentId || isSaving}>
                <Save className="mr-2 h-4 w-4" />
                Save notebook
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setDeleteDialogOpen(true)}
                disabled={!documentId || isDeleting}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete notebook
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!isPreviewMode && (
        <div className="border-b border-quack-dark border-opacity-10 bg-white p-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={onAddMarkdown}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
            >
              <NotebookText className="w-4 h-4" />
              Add Markdown
            </Button>
            <Button
              onClick={onAddSQL}
              variant="default"
              size="sm"
              className="flex items-center gap-2"
            >
              <DatabaseZap className="w-4 h-4" />
              Add SQL
            </Button>
          </div>
        </div>
      )}

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
              onClick={() => void handleConfirmDelete()}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
