import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { BookOpen, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateNotebook } from '@/hooks/useNotebooks';
import { useDeleteTable, useTables, type TableMetadata } from '@/hooks/useTables';
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

interface TableListProps {
  selectedTable: string | null;
  onSelectTable: (tableName: string | null) => void;
}

export function TableList({ selectedTable, onSelectTable }: TableListProps) {
  const { data: tables, isLoading, error } = useTables();
  const deleteTableMutation = useDeleteTable();
  const createNotebookMutation = useCreateNotebook();
  const navigate = useNavigate();
  const [tableToDelete, setTableToDelete] = useState<TableMetadata | null>(null);
  const [tableOpeningNotebook, setTableOpeningNotebook] = useState<string | null>(null);

  const handleOpenWorkbook = async (tableName: string) => {
    try {
      setTableOpeningNotebook(tableName);
      const notebook = await createNotebookMutation.mutateAsync({
        name: `${tableName} workbook`,
        cells: [
          {
            title: `Explore ${tableName}`,
            cell_type: 'sql',
            sql_text: `SELECT * FROM "${tableName}" LIMIT 100`,
            selected_tables: [tableName],
          },
        ],
      });
      await navigate({
        to: '/notebooks',
        search: {
          notebookId: notebook.id,
        },
      });
      toast.success('Workbook created');
    } catch (mutationError) {
      toast.error(`Failed to open workbook: ${(mutationError as Error).message}`);
    } finally {
      setTableOpeningNotebook(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!tableToDelete) {
      return;
    }

    try {
      await deleteTableMutation.mutateAsync(tableToDelete.name);
      if (selectedTable === tableToDelete.name) {
        onSelectTable(null);
      }
      toast.success('Table deleted successfully');
      setTableToDelete(null);
    } catch (mutationError) {
      toast.error(`Failed to delete table: ${(mutationError as Error).message}`);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading tables..." />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!tables || tables.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm text-quack-dark text-opacity-60">No tables created yet</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-quack-dark mb-3">Tables</h3>
      <div className="space-y-2">
        {tables.map((table) => (
          <div
            key={table.id}
            onClick={() => onSelectTable(table.name)}
            className={`
              rounded border p-3 transition-colors cursor-pointer
              ${
                selectedTable === table.name
                  ? 'bg-quack-gold_bg border-quack-orange text-quack-dark'
                  : 'bg-quack-gold bg-opacity-5 border-quack-dark border-opacity-10 hover:bg-opacity-10'
              }
            `}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{table.name}</div>
                <div className="text-xs text-quack-dark text-opacity-60">
                  {new Date(table.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  title="Open in workbook"
                  aria-label={`Open ${table.name} in a workbook`}
                  disabled={tableOpeningNotebook === table.name}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleOpenWorkbook(table.name);
                  }}
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  title="Delete table"
                  aria-label={`Delete ${table.name}`}
                  disabled={deleteTableMutation.isPending && tableToDelete?.id === table.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setTableToDelete(table);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!tableToDelete} onOpenChange={(open) => !open && setTableToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete table?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the table and clear notebook cells that selected it.
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
