import { X } from 'lucide-react';
import { Button } from './ui/button';
import { NotebooksList } from './NotebooksList';
import type { Notebook } from '@/hooks/useNotebooks';

interface WorkspaceSidebarProps {
  currentNotebookId: string | null;
  onSelectNotebook: (notebook: Notebook) => void;
  onCreateNotebook: () => void;
  onClose: () => void;
}

/**
 * Sidebar for displaying notebooks
 */
export function WorkspaceSidebar({
  currentNotebookId,
  onSelectNotebook,
  onCreateNotebook,
  onClose,
}: WorkspaceSidebarProps) {
  return (
    <div className="w-80 border-r border-quack-dark border-opacity-10 bg-white flex flex-col">
      <div className="p-4 border-b border-quack-dark border-opacity-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-quack-dark">Notebooks</h2>
        <Button onClick={onClose} variant="ghost" size="sm" title="Close sidebar">
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <NotebooksList
          currentNotebookId={currentNotebookId}
          onSelectNotebook={onSelectNotebook}
          onCreateNotebook={onCreateNotebook}
        />
      </div>
    </div>
  );
}
