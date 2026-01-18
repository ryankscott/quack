import { X } from 'lucide-react';
import { Button } from './ui/button';
import { SavedQueriesList } from './SavedQueriesList';
import type { SavedQuery } from '@/hooks/useQueries';

interface WorkspaceSidebarProps {
  onLoadQuery: (query: SavedQuery) => void;
  onClose: () => void;
}

/**
 * Sidebar for displaying saved queries
 */
export function WorkspaceSidebar({ onLoadQuery, onClose }: WorkspaceSidebarProps) {
  return (
    <div className="w-80 border-r border-quack-dark border-opacity-10 bg-white flex flex-col">
      <div className="p-4 border-b border-quack-dark border-opacity-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-quack-dark">Saved Queries</h2>
        <Button onClick={onClose} variant="ghost" size="sm" title="Close sidebar">
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SavedQueriesList onLoadQuery={onLoadQuery} />
      </div>
    </div>
  );
}
