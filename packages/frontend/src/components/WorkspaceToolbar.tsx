import { Plus, DatabaseZap, NotebookText } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { NotebookActions } from './NotebookActions';

import type { CellState } from '@/hooks/useCellManager';

interface WorkspaceToolbarProps {
  documentName: string;
  documentId: string | null;
  isSidebarOpen: boolean;
  mode: 'edit' | 'preview';
  isSaving: boolean;
  cells: CellState[];
  onDocumentNameChange: (name: string) => void;
  onSave: () => void;
  onModeChange: (mode: 'edit' | 'preview') => void;
  onToggleSidebar: () => void;
  onAddMarkdown: () => void;
  onAddSQL: () => void;
}

/**
 * Toolbar section of workspace with notebook controls and mode switcher
 */
export function WorkspaceToolbar({
  documentName,
  documentId,
  isSidebarOpen,
  mode,
  isSaving,
  cells,
  onDocumentNameChange,
  onSave,
  onModeChange,
  onToggleSidebar,
  onAddMarkdown,
  onAddSQL,
}: WorkspaceToolbarProps) {
  const isPreviewMode = mode === 'preview';

  return (
    <>
      {/* Main Toolbar */}
      <div className="p-3 border-b border-quack-dark border-opacity-10 bg-white flex flex-wrap items-center gap-3">
        {!isSidebarOpen && (
          <Button
            onClick={onToggleSidebar}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Show Notebooks
          </Button>
        )}

        <div className="flex items-center gap-3">
          <Input
            value={documentName}
            onChange={(e) => onDocumentNameChange(e.target.value)}
            placeholder="Notebook name"
            disabled={isPreviewMode}
            className="text-sm"
          />
          <Button
            onClick={onSave}
            variant="secondary"
            size="sm"
            disabled={!documentId || isSaving || isPreviewMode}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <NotebookActions notebookId={documentId} cells={cells} notebookName={documentName} variant="toolbar" className="flex-wrap" />

        <div className="flex-1" />

        <Tabs value={mode} onValueChange={(value) => onModeChange(value as 'edit' | 'preview')}>
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cell Actions Toolbar (only in edit mode) */}
      {!isPreviewMode && (
        <div className="p-3 border-b border-quack-dark border-opacity-10 bg-white flex items-center justify-between gap-3">
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
    </>
  );
}
