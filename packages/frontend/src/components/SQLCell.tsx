import { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { SQLEditor } from './SQLEditor';
import { ResultTable } from './ResultTable';
import { ChartViewer } from './ChartViewer';
import { ChartConfigPanel } from './ChartConfig';
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

  const [showChart, setShowChart] = useState(false);
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
      <div className="border-b border-quack-dark border-opacity-10 bg-quack-gold bg-opacity-5 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-quack-dark text-opacity-60 font-mono">
            Cell {cellIndex + 1}
          </span>
          {cell.isExecuting && <span className="text-xs text-quack-orange">Executing...</span>}
          {cell.isDirty && <span className="text-xs text-quack-gold">• Unsaved</span>}
        </div>
        <div className="flex items-center gap-1">
          {totalCells > 1 && (
            <>
              {cellIndex > 0 && (
                <button
                  onClick={onMoveUp}
                  className="p-1 text-quack-dark text-opacity-50 hover:text-opacity-80"
                  title="Move up"
                >
                  <ChevronUp size={16} />
                </button>
              )}
              {cellIndex < totalCells - 1 && (
                <button
                  onClick={onMoveDown}
                  className="p-1 text-quack-dark text-opacity-50 hover:text-opacity-80"
                  title="Move down"
                >
                  <ChevronDown size={16} />
                </button>
              )}
              <button
                onClick={onRemove}
                className="p-1 text-quack-dark text-opacity-50 hover:text-red-600"
                title="Remove cell"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 flex-1">
            <input
              type="text"
              value={cell.queryName}
              onChange={(e) => onUpdate({ queryName: e.target.value, isDirty: true })}
              placeholder="Query name..."
              className="input-base text-sm font-semibold"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={
                !cell.sql.trim() ||
                !cell.queryName.trim() ||
                createQueryMutation.isPending ||
                updateQueryMutation.isPending
              }
              className="btn-secondary text-sm"
            >
              {createQueryMutation.isPending || updateQueryMutation.isPending
                ? 'Saving...'
                : cell.savedQueryId
                  ? 'Update'
                  : 'Save'}
            </button>
            <button
              onClick={handleExecute}
              disabled={!cell.sql.trim() || cell.isExecuting}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {cell.isExecuting ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Running...
                </>
              ) : (
                <>
                  <span>▶</span>
                  Run (⌘↵)
                </>
              )}
            </button>
          </div>
        </div>
        <div className="border border-quack-dark border-opacity-20 rounded overflow-hidden">
          <SQLEditor
            value={cell.sql}
            onChange={(sql) => onUpdate({ sql, isDirty: true })}
            onExecute={handleExecute}
            height="200px"
            tableNames={tableNames}
          />
        </div>
        {cell.error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
            <div className="text-sm font-semibold text-red-800 mb-1">Error</div>
            <div className="text-sm text-red-700 font-mono">{cell.error}</div>
          </div>
        )}
      </div>

      {cell.result && (
        <div className="p-4 pt-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-quack-dark text-opacity-70">
              {cell.result.rowCount.toLocaleString()} row{cell.result.rowCount !== 1 ? 's' : ''}{' '}
              returned
              {cell.result.truncated && ' (truncated)'}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowChart(false)}
                className={`px-3 py-1 text-sm rounded ${!showChart ? 'bg-quack-orange text-white' : 'bg-quack-dark bg-opacity-10 text-quack-dark hover:bg-opacity-20'}`}
              >
                Table
              </button>
              <button
                onClick={() => setShowChart(true)}
                className={`px-3 py-1 text-sm rounded ${showChart ? 'bg-quack-orange text-white' : 'bg-quack-dark bg-opacity-10 text-quack-dark hover:bg-opacity-20'}`}
              >
                Chart
              </button>
            </div>
          </div>

          {showChart && chartConfig && (
            <div className="max-h-96 overflow-auto">
              <ChartConfigPanel
                config={chartConfig}
                result={cell.result}
                onChange={setChartConfig}
              />
              <div className="border border-quack-dark border-opacity-10 rounded overflow-hidden">
                <ChartViewer config={chartConfig} result={cell.result} />
              </div>
            </div>
          )}

          {!showChart && (
            <div className="max-h-96 overflow-x-auto overflow-y-auto border border-quack-dark border-opacity-10 rounded">
              <ResultTable result={cell.result} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
