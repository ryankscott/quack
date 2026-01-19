import { useEffect } from 'react';
import { SQLCellHeader } from './SQLCellHeader';
import { SQLCellEditor } from './SQLCellEditor';
import { SQLCellError } from './SQLCellError';
import { SQLCellResults } from './SQLCellResults';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
import { useQueryExecution } from '@/hooks/useQuery';
import { useTables } from '@/hooks/useTables';
import type { CellState } from '@/hooks/useCellManager';
import { getDefaultChartConfig } from '@/lib/chart-config';

interface SQLCellProps {
  cell: CellState;
  cellIndex: number;
  totalCells: number;
  onUpdate: (updates: Partial<CellState>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function SQLCell({
  cell,
  cellIndex,
  totalCells,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SQLCellProps) {
  const queryMutation = useQueryExecution();
  const { data: tablesData } = useTables();

  // Extract table names for autocomplete
  const tableNames = tablesData?.map((t) => t.name) || [];

  useEffect(() => {
    if (cell.result && !cell.chartConfig) {
      onUpdate({ chartConfig: getDefaultChartConfig(cell.result) });
    }
  }, [cell.result]);

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

  return (
    <div className="flex flex-col h-auto min-w-0 border border-quack-dark border-opacity-10 rounded-lg bg-white mb-4 max-w-6xl">
      <SQLCellHeader
        cellIndex={cellIndex}
        totalCells={totalCells}
        isExecuting={cell.isExecuting}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onRemove={onRemove}
      />

      <Collapsible open={!cell.isEditorCollapsed}>
        <CollapsibleContent>
          <SQLCellEditor
            sql={cell.sql}
            tableNames={tableNames}
            isExecuting={cell.isExecuting}
            isCollapsed={cell.isEditorCollapsed}
            onSqlChange={(sql) => onUpdate({ sql })}
            onExecute={handleExecute}
            onToggleCollapse={() => onUpdate({ isEditorCollapsed: !cell.isEditorCollapsed })}
          />
        </CollapsibleContent>
      </Collapsible>

      {cell.error && <SQLCellError error={cell.error} />}

      {cell.result && (
        <Collapsible open={!cell.isPreviewCollapsed}>
          <CollapsibleContent>
            <SQLCellResults
              result={cell.result}
              chartConfig={cell.chartConfig || null}
              isCollapsed={cell.isPreviewCollapsed}
              onChartConfigChange={(config) => onUpdate({ chartConfig: config })}
              onToggleCollapse={() => onUpdate({ isPreviewCollapsed: !cell.isPreviewCollapsed })}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
