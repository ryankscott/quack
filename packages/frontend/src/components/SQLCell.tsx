import { useEffect, useState } from 'react';
import { SQLCellHeader } from './SQLCellHeader';
import { SQLCellEditor } from './SQLCellEditor';
import { SQLCellError } from './SQLCellError';
import { SQLCellResults } from './SQLCellResults';
import { useQueryExecution } from '@/hooks/useQuery';
import { useCreateQuery, useUpdateQuery, type SavedQuery } from '@/hooks/useQueries';
import { useTables } from '@/hooks/useTables';
import type { CellState } from '@/hooks/useCellManager';
import { getDefaultChartConfig, type ChartConfig } from '@/lib/chart-config';

interface SQLCellProps {
  cell: CellState;
  cellIndex: number;
  totalCells: number;
  onUpdate: (updates: Partial<CellState>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  initialQuery?: SavedQuery;
  onQuerySaved?: (query: SavedQuery) => void;
}

export function SQLCell({
  cell,
  cellIndex,
  totalCells,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  initialQuery,
  onQuerySaved,
}: SQLCellProps) {
  const queryMutation = useQueryExecution();
  const createQueryMutation = useCreateQuery();
  const updateQueryMutation = useUpdateQuery();
  const { data: tablesData } = useTables();

  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);

  // Extract table names for autocomplete
  const tableNames = tablesData?.map((t) => t.name) || [];

  useEffect(() => {
    if (cell.result && !chartConfig) {
      setChartConfig(getDefaultChartConfig(cell.result));
    }
  }, [cell.result]);

  useEffect(() => {
    if (initialQuery) {
      onUpdate({
        sql: initialQuery.sql,
        queryName: initialQuery.name,
        savedQueryId: initialQuery.id,
        isDirty: false,
      });
    }
  }, [initialQuery]);

  useEffect(() => {
    if (queryMutation.data && !cell.result) {
      onUpdate({ result: queryMutation.data, error: undefined });
    }
    if (queryMutation.error && !cell.error) {
      onUpdate({ error: queryMutation.error.message, result: undefined });
    }
  }, [queryMutation.data, queryMutation.error]);

  const handleExecute = () => {
    if (!cell.sql.trim()) return;

    onUpdate({ isExecuting: true });
    queryMutation.mutate(
      { sql: cell.sql },
      {
        onSuccess: (result) => {
          onUpdate({ result, error: undefined, isExecuting: false });
        },
        onError: (error) => {
          onUpdate({ error: error.message, result: undefined, isExecuting: false });
        },
      }
    );
  };

  const handleSave = async () => {
    if (!cell.sql.trim() || !cell.queryName.trim()) {
      alert('Please provide both a query name and SQL code');
      return;
    }

    try {
      if (cell.savedQueryId) {
        const updated = await updateQueryMutation.mutateAsync({
          id: cell.savedQueryId,
          request: { name: cell.queryName, sql: cell.sql },
        });
        onUpdate({ isDirty: false });
        onQuerySaved?.(updated);
      } else {
        const created = await createQueryMutation.mutateAsync({
          name: cell.queryName,
          sql: cell.sql,
        });
        onUpdate({ savedQueryId: created.id, isDirty: false });
        onQuerySaved?.(created);
      }
    } catch (error) {
      alert(`Failed to save query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex flex-col h-full border border-quack-dark border-opacity-10 rounded-lg bg-white mb-4 max-w-full overflow-hidden">
      <SQLCellHeader
        cellIndex={cellIndex}
        totalCells={totalCells}
        isExecuting={cell.isExecuting}
        isDirty={cell.isDirty}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onRemove={onRemove}
      />

      <SQLCellEditor
        sql={cell.sql}
        queryName={cell.queryName}
        tableNames={tableNames}
        isExecuting={cell.isExecuting}
        isSaving={createQueryMutation.isPending || updateQueryMutation.isPending}
        savedQueryId={cell.savedQueryId}
        onSqlChange={(sql) => onUpdate({ sql, isDirty: true })}
        onQueryNameChange={(queryName) => onUpdate({ queryName, isDirty: true })}
        onExecute={handleExecute}
        onSave={handleSave}
      />

      {cell.error && <SQLCellError error={cell.error} />}

      {cell.result && (
        <SQLCellResults
          result={cell.result}
          chartConfig={chartConfig}
          onChartConfigChange={setChartConfig}
        />
      )}
    </div>
  );
}
