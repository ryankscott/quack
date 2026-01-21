import { useState } from 'react';
import { ResultTable } from './ResultTable';
import { ChartViewer } from './ChartViewer';
import { ChartConfigPanel } from './ChartConfig';
import { SaveToTableDialog } from './SaveToTableDialog';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Eye, EyeOff, Settings, Database } from 'lucide-react';
import { CollapsibleContent } from './ui/collapsible';
import type { QueryResult } from '@/hooks/useQuery';
import type { ChartConfig } from '@/lib/chart-config';

interface SQLCellResultsProps {
  result: QueryResult;
  chartConfig: ChartConfig | null;
  isCollapsed?: boolean;
  displayMode?: 'table' | 'chart';
  sql?: string;
  allowedTables?: string[];
  onChartConfigChange: (config: ChartConfig) => void;
  onToggleCollapse?: () => void;
  onDisplayModeChange?: (mode: 'table' | 'chart') => void;
  onTableCreated?: (tableName: string) => void;
}

/**
 * Results section of SQL cell with table/chart toggle and display
 */
export function SQLCellResults({
  result,
  chartConfig,
  isCollapsed,
  displayMode = 'table',
  sql,
  allowedTables,
  onChartConfigChange,
  onToggleCollapse,
  onDisplayModeChange,
  onTableCreated,
  cellId,
}: SQLCellResultsProps & { cellId?: string }) {
  const showChart = displayMode === 'chart';
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(true);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  return (
    <div className="mt-4" data-cell-id={cellId}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="text-xs uppercase text-quack-dark text-opacity-60 font-semibold">
            Results
          </div>
          <div className="text-sm text-quack-dark text-opacity-70">
            {result.rowCount.toLocaleString()} row{result.rowCount !== 1 ? 's' : ''}
            {result.truncated && ' (truncated)'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Left side: Save to table button */}
          {sql && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => setIsSaveDialogOpen(true)}
              title="Save query results to a new table"
            >
              <Database size={14} />
              <span className="ml-1 text-xs">Save to table</span>
            </Button>
          )}

          {/* Right side: Hide button, Configure button, and Table/Chart tabs */}
          <div className="flex items-center gap-2 ml-auto">
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={onToggleCollapse}
                title={isCollapsed ? 'Show results' : 'Hide results'}
              >
                {isCollapsed ? <EyeOff size={14} /> : <Eye size={14} />}
                <span className="ml-1 text-xs">{isCollapsed ? 'Show' : 'Hide'}</span>
              </Button>
            )}
            {showChart && chartConfig && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)}
                title={isConfigPanelOpen ? 'Hide configuration' : 'Show configuration'}
              >
                <Settings size={14} />
                <span className="ml-1 text-xs">Configure</span>
              </Button>
            )}
            <Tabs
              value={displayMode}
              onValueChange={(value) => onDisplayModeChange?.(value as 'table' | 'chart')}
            >
              <TabsList className="h-7">
                <TabsTrigger value="table" className="text-xs h-6 px-3">
                  Table
                </TabsTrigger>
                <TabsTrigger value="chart" className="text-xs h-6 px-3">
                  Chart
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <CollapsibleContent>
        {showChart && chartConfig ? (
          <div className="flex border border-quack-dark border-opacity-10 rounded h-[500px]">
            {/* Chart Area */}
            <div className="flex-1 overflow-auto">
              <ChartViewer config={chartConfig} result={result} />
            </div>

            {/* Config Panel */}
            {isConfigPanelOpen && (
              <ChartConfigPanel
                config={chartConfig}
                result={result}
                onChange={onChartConfigChange}
                onClose={() => setIsConfigPanelOpen(false)}
              />
            )}
          </div>
        ) : (
          <div className="max-h-96 overflow-auto border border-quack-dark border-opacity-10 rounded">
            <ResultTable result={result} />
          </div>
        )}
      </CollapsibleContent>

      {/* Save to Table Dialog */}
      {sql && (
        <SaveToTableDialog
          open={isSaveDialogOpen}
          onOpenChange={setIsSaveDialogOpen}
          sql={sql}
          allowedTables={allowedTables}
          onSuccess={(tableName, rowCount) => {
            console.log(`Created table '${tableName}' with ${rowCount} rows`);
            onTableCreated?.(tableName);
          }}
        />
      )}
    </div>
  );
}
