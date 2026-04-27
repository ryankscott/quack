import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';
import { NotebooksSidebar } from '@/components/NotebooksSidebar';
import { NotebookToolbar } from '@/components/NotebookToolbar';
import { NotebookCellList } from '@/components/NotebookCellList';
import { NotebookPreviewSimple } from '@/components/NotebookPreviewSimple';
import { NotebookActions } from '@/components/NotebookActions';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useCellManager } from '@/hooks/useCellManager';
import {
  useNotebooks,
  useNotebook,
  useCreateNotebook,
  useDeleteNotebook,
  useUpdateNotebook,
  type CreateNotebookRequest,
  type Notebook,
} from '@/hooks/useNotebooks';

export function NotebooksPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/notebooks' });
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
    newlyAddedCellId,
    clearNewlyAddedCellId,
  } = useCellManager();
  const notebooksQuery = useNotebooks();
  const currentNotebookQuery = useNotebook(currentNotebookId);
  const createNotebookMutation = useCreateNotebook();
  const deleteNotebookMutation = useDeleteNotebook();
  const updateNotebookMutation = useUpdateNotebook();

  const handleSelectNotebook = (notebook: Notebook) => {
    setCurrentNotebookId(notebook.id);
    setCurrentNotebookName(notebook.name);
    void navigate({
      to: '/notebooks',
      search: {
        notebookId: notebook.id,
      },
    });
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

  const handleSaveNotebook = async () => {
    if (!currentNotebookId) return;
    const payload: CreateNotebookRequest = {
      name: currentNotebookName.trim() || 'Untitled',
      cells: cells.map((cell) => ({
        title: cell.title?.trim() || undefined,
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

  const handleDeleteNotebook = async (notebookId: string) => {
    await deleteNotebookMutation.mutateAsync(notebookId);

    if (currentNotebookId !== notebookId) {
      return;
    }

    setCellsDirectly([]);

    const remainingNotebooks = (notebooksQuery.data ?? []).filter((notebook) => notebook.id !== notebookId);
    const nextNotebook = remainingNotebooks[0];

    if (nextNotebook) {
      setCurrentNotebookId(nextNotebook.id);
      setCurrentNotebookName(nextNotebook.name);
      void navigate({
        to: '/notebooks',
        search: {
          notebookId: nextNotebook.id,
        },
      });
      return;
    }

    setCurrentNotebookId(null);
    setCurrentNotebookName('Untitled');
    void navigate({
      to: '/notebooks',
      search: {},
    });
  };

  useEffect(() => {
    if (!search.notebookId || search.notebookId === currentNotebookId) {
      return;
    }

    setCurrentNotebookId(search.notebookId);
  }, [currentNotebookId, search.notebookId]);

  // Load cells from selected notebook
  useEffect(() => {
    if (currentNotebookQuery.data?.cells) {
      setCurrentNotebookName(currentNotebookQuery.data.name);
      const loadedCells = currentNotebookQuery.data.cells.map((cell) => ({
        id: `cell-${cell.id}`,
        title: cell.title || '',
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
        void navigate({
          to: '/notebooks',
          search: {
            notebookId: firstNotebook.id,
          },
        });
      }
      return;
    }

    setIsCreatingNotebook(true);
    createNotebookMutation
      .mutateAsync({
        name: 'Untitled',
        cells: cells.map((cell) => ({
          title: cell.title?.trim() || undefined,
          cell_type: cell.type,
          sql_text: cell.type === 'sql' ? cell.sql : undefined,
          markdown_text: cell.type === 'markdown' ? cell.markdown : undefined,
          chart_config: cell.chartConfig ? JSON.stringify(cell.chartConfig) : undefined,
        })),
      })
      .then((notebook) => {
        setCurrentNotebookId(notebook.id);
        setCurrentNotebookName(notebook.name);
        void navigate({
          to: '/notebooks',
          search: {
            notebookId: notebook.id,
          },
        });
      })
      .finally(() => setIsCreatingNotebook(false));
  }, [notebooksQuery.isSuccess, notebooksQuery.data, isCreatingNotebook, currentNotebookId, navigate]);

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-full overflow-hidden">
        <NotebooksSidebar
          currentNotebookId={currentNotebookId}
          onSelectNotebook={handleSelectNotebook}
          onCreateNotebook={handleCreateNotebook}
          onDeleteNotebook={async (notebookId) => {
            try {
              await handleDeleteNotebook(notebookId);
              toast.success('Notebook deleted successfully');
            } catch (error) {
              toast.error(`Failed to delete notebook: ${(error as Error).message}`);
              throw error;
            }
          }}
        />
        <SidebarInset className="overflow-hidden bg-quack-gold_bg">
          <div className="flex h-full min-w-0 flex-col overflow-hidden bg-quack-gold_bg">
            <NotebookToolbar
              documentName={currentNotebookName}
              documentId={currentNotebookId}
              mode={mode}
              isSaving={updateNotebookMutation.isPending}
              isDeleting={deleteNotebookMutation.isPending}
              onDocumentNameChange={setCurrentNotebookName}
              onSave={handleSaveNotebook}
              onDelete={async () => {
                if (!currentNotebookId) return;

                try {
                  await handleDeleteNotebook(currentNotebookId);
                  toast.success('Notebook deleted successfully');
                } catch (error) {
                  toast.error(`Failed to delete notebook: ${(error as Error).message}`);
                  throw error;
                }
              }}
              onModeChange={setMode}
              onAddMarkdown={handleAddMarkdownCell}
              onAddSQL={handleAddCell}
            />

            {mode === 'preview' ? (
              <NotebookPreviewSimple cells={cells} />
            ) : (
              <NotebookCellList
                cells={cells}
                getCellIndex={getCellIndex}
                onUpdateCell={updateCell}
                onRemoveCell={removeCell}
                onMoveCellUp={moveCellUp}
                onMoveCellDown={moveCellDown}
                newlyAddedCellId={newlyAddedCellId}
                onCellFocused={clearNewlyAddedCellId}
              />
            )}

            <NotebookActions
              notebookId={currentNotebookId}
              cells={cells}
              notebookName={currentNotebookName}
              variant="footer"
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
