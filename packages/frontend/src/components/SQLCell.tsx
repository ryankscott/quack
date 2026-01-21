import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { SQLCellHeader } from './SQLCellHeader';
import { SQLCellEditor, type SQLCellEditorRef } from './SQLCellEditor';
import { SQLCellError } from './SQLCellError';
import { SQLCellResults } from './SQLCellResults';
import { Collapsible } from './ui/collapsible';
import { useQueryExecution } from '@/hooks/useQuery';
import { useTables } from '@/hooks/useTables';
import { useTableSchemas } from '@/hooks/useTableSchemas';
import type { CellState } from '@/hooks/useCellManager';
import { getDefaultChartConfig } from '@/lib/chart-config';

export interface SQLCellRef {
  scrollIntoView: () => void;
  focus: () => void;
}

interface SQLCellProps {
  cell: CellState;
  cellIndex: number;
  totalCells: number;
  onUpdate: (updates: Partial<CellState>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const SQLCell = forwardRef<SQLCellRef, SQLCellProps>(function SQLCell(
  { cell, cellIndex, totalCells, onUpdate, onRemove, onMoveUp, onMoveDown },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<SQLCellEditorRef>(null);

  useImperativeHandle(ref, () => ({
    scrollIntoView: () => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    focus: () => {
      editorRef.current?.focus();
    },
  }));
  const queryMutation = useQueryExecution();
  const { data: tablesData } = useTables();

  // Extract table names for autocomplete - filter to selected tables if any are selected
  const allTableNames = tablesData?.map((t) => t.name) || [];
  const tableNames =
    cell.selectedTables && cell.selectedTables.length > 0
      ? cell.selectedTables.filter((name) => allTableNames.includes(name))
      : allTableNames;

  // Fetch schemas for selected tables to enable column autocomplete
  const selectedTableNames = cell.selectedTables || [];
  const { data: columnsByTable, isLoading: isSchemasLoading } = useTableSchemas(selectedTableNames);

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

    // Block execution if no tables are selected
    if (!cell.selectedTables || cell.selectedTables.length === 0) {
      onUpdate({
        error:
          'No tables are selected for this cell. Please select at least one table before executing the query.',
        result: undefined,
      });
      return;
    }

    onUpdate({ isExecuting: true, error: undefined });
    queryMutation.mutate(
      { sql: cell.sql, allowed_tables: cell.selectedTables },
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
    <div
      ref={containerRef}
      className="flex flex-col h-auto min-w-0 border border-quack-dark border-opacity-10 rounded-lg bg-white mb-4 max-w-6xl"
    >
      <SQLCellHeader
        cellIndex={cellIndex}
        totalCells={totalCells}
        isExecuting={cell.isExecuting}
        selectedTables={cell.selectedTables || []}
        onTablesChange={(tables) => onUpdate({ selectedTables: tables })}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onRemove={onRemove}
      />

      <div className="p-4">
        <Collapsible open={!cell.isEditorCollapsed}>
          <SQLCellEditor
            ref={editorRef}
            sql={cell.sql}
            tableNames={tableNames}
            columnsByTable={columnsByTable}
            selectedTables={selectedTableNames}
            isSchemasLoading={isSchemasLoading}
            isExecuting={cell.isExecuting}
            isCollapsed={cell.isEditorCollapsed}
            onSqlChange={(sql) => onUpdate({ sql })}
            onExecute={handleExecute}
            onToggleCollapse={() => onUpdate({ isEditorCollapsed: !cell.isEditorCollapsed })}
          />
        </Collapsible>

        {cell.error && <SQLCellError error={cell.error} />}

        {cell.result && (
          <Collapsible open={!cell.isPreviewCollapsed}>
            <SQLCellResults
              result={cell.result}
              chartConfig={cell.chartConfig || null}
              isCollapsed={cell.isPreviewCollapsed}
              displayMode={cell.displayMode}
              cellId={cell.id}
              onChartConfigChange={(config) => onUpdate({ chartConfig: config })}
              onToggleCollapse={() => onUpdate({ isPreviewCollapsed: !cell.isPreviewCollapsed })}
              onDisplayModeChange={(mode) => onUpdate({ displayMode: mode })}
            />
          </Collapsible>
        )}
      </div>
    </div>
  );
});
