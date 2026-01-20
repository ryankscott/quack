import { useEffect, useState } from 'react';
import { WorkspaceSidebar } from '@/components/WorkspaceSidebar';
import { WorkspaceToolbar } from '@/components/WorkspaceToolbar';
import { WorkspaceCellList } from '@/components/WorkspaceCellList';
import { WorkspacePreview } from '@/components/WorkspacePreview';
import { useCellManager } from '@/hooks/useCellManager';
import {
  useNotebooks,
  useNotebook,
  useCreateNotebook,
  useUpdateNotebook,
  type CreateNotebookRequest,
  type Notebook,
} from '@/hooks/useNotebooks';

export function WorkspacePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentNotebookId, setCurrentNotebookId] = useState<string | null>(null);
  const [currentNotebookName, setCurrentNotebookName] = useState('Untitled');
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const {
    cells,
    addCell,
    removeCell,
    updateCell,
    moveCellUp,
    moveCellDown,
    getCellIndex,
    setCellsDirectly,
  } = useCellManager();
  const notebooksQuery = useNotebooks();
  const currentNotebookQuery = useNotebook(currentNotebookId);
  const createNotebookMutation = useCreateNotebook();
  const updateNotebookMutation = useUpdateNotebook();

  const handleSelectNotebook = (notebook: Notebook) => {
    setCurrentNotebookId(notebook.id);
    setCurrentNotebookName(notebook.name);
  };

  const handleCreateNotebook = () => {
    // Notebook creation is handled in NotebooksList
  };

  const handleAddCell = () => {
    addCell('sql');
  };

  const handleAddMarkdownCell = () => {
    addCell('markdown');
  };

  const handleChartImageGenerated = (cellId: string, imageUrl: string) => {
    updateCell(cellId, { chartImageUrl: imageUrl });
  };

  const handleSaveNotebook = async () => {
    if (!currentNotebookId) return;
      const payload: CreateNotebookRequest = {
        name: currentNotebookName.trim() || 'Untitled',
        cells: cells.map((cell) => ({
          cell_type: cell.type,
          sql_text: cell.type === 'sql' ? cell.sql : undefined,
          markdown_text: cell.type === 'markdown' ? cell.markdown : undefined,
          chart_config: cell.chartConfig ? JSON.stringify(cell.chartConfig) : undefined,
          selected_tables: cell.selectedTables,
        })),
      };

    await updateNotebookMutation.mutateAsync({
      id: currentNotebookId,
      request: payload,
    });
  };

  // Load cells from selected notebook
  useEffect(() => {
    if (currentNotebookQuery.data?.cells) {
      const loadedCells = currentNotebookQuery.data.cells.map((cell) => ({
        id: `cell-${cell.id}`,
        type: cell.cell_type as 'sql' | 'markdown',
        sql: cell.sql_text || '',
        markdown: cell.markdown_text || '',
        isExecuting: false,
        chartConfig: cell.chart_config ? JSON.parse(cell.chart_config) : undefined,
        selectedTables: cell.selected_tables || undefined,
      }));
      setCellsDirectly(loadedCells);
    }
  }, [currentNotebookQuery.data, setCellsDirectly]);

  // Auto-select first notebook or create one if none exist
  useEffect(() => {
    if (!notebooksQuery.isSuccess || isCreatingNotebook || currentNotebookId) return;
    if (notebooksQuery.data.length > 0) {
      const firstNotebook = notebooksQuery.data[0];
      if (firstNotebook) {
        setCurrentNotebookId(firstNotebook.id);
        setCurrentNotebookName(firstNotebook.name);
      }
      return;
    }

    setIsCreatingNotebook(true);
    createNotebookMutation
      .mutateAsync({
        name: 'Untitled',
        cells: cells.map((cell) => ({
          cell_type: cell.type,
          sql_text: cell.type === 'sql' ? cell.sql : undefined,
          markdown_text: cell.type === 'markdown' ? cell.markdown : undefined,
          chart_config: cell.chartConfig ? JSON.stringify(cell.chartConfig) : undefined,
        })),
      })
      .then((notebook) => {
        setCurrentNotebookId(notebook.id);
        setCurrentNotebookName(notebook.name);
      })
      .finally(() => setIsCreatingNotebook(false));
  }, [notebooksQuery.isSuccess, notebooksQuery.data, isCreatingNotebook, currentNotebookId]);

  return (
    <div className="h-full flex overflow-hidden">
      {isSidebarOpen && (
        <WorkspaceSidebar
          currentNotebookId={currentNotebookId}
          onSelectNotebook={handleSelectNotebook}
          onCreateNotebook={handleCreateNotebook}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-quack-gold_bg">
        <WorkspaceToolbar
          documentName={currentNotebookName}
          documentId={currentNotebookId}
          isSidebarOpen={isSidebarOpen}
          mode={mode}
          isSaving={updateNotebookMutation.isPending}
          cells={cells}
          onDocumentNameChange={setCurrentNotebookName}
          onSave={handleSaveNotebook}
          onModeChange={setMode}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          onAddMarkdown={handleAddMarkdownCell}
          onAddSQL={handleAddCell}
        />

        {mode === 'preview' ? (
          <WorkspacePreview cells={cells} onChartImagesGenerated={handleChartImageGenerated} />
        ) : (
          <WorkspaceCellList
            cells={cells}
            getCellIndex={getCellIndex}
            onUpdateCell={updateCell}
            onRemoveCell={removeCell}
            onMoveCellUp={moveCellUp}
            onMoveCellDown={moveCellDown}
          />
        )}
      </div>
    </div>
  );
}
