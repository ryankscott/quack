import { ResultTable } from './ResultTable';
import { ChartViewer } from './ChartViewer';
import { ChartConfigPanel } from './ChartConfig';
import { Button } from './ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { CollapsibleContent } from './ui/collapsible';
import type { QueryResult } from '@/hooks/useQuery';
import type { ChartConfig } from '@/lib/chart-config';

interface SQLCellResultsProps {
  result: QueryResult;
  chartConfig: ChartConfig | null;
  isCollapsed?: boolean;
  displayMode?: 'table' | 'chart';
  onChartConfigChange: (config: ChartConfig) => void;
  onToggleCollapse?: () => void;
  onDisplayModeChange?: (mode: 'table' | 'chart') => void;
}

/**
 * Results section of SQL cell with table/chart toggle and display
 */
export function SQLCellResults({ 
  result, 
  chartConfig, 
  isCollapsed,
  displayMode = 'table',
  onChartConfigChange,
  onToggleCollapse,
  onDisplayModeChange,
}: SQLCellResultsProps) {
  const showChart = displayMode === 'chart';

  return (
    <div className="mt-4">
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
          <Button
            onClick={() => onDisplayModeChange?.('table')}
            variant={!showChart ? 'default' : 'outline'}
            size="sm"
          >
            Table
          </Button>
          <Button
            onClick={() => onDisplayModeChange?.('chart')}
            variant={showChart ? 'default' : 'outline'}
            size="sm"
          >
            Chart
          </Button>
        </div>
      </div>

      <CollapsibleContent>
        {showChart && chartConfig ? (
          <div className="space-y-3">
            <ChartConfigPanel config={chartConfig} result={result} onChange={onChartConfigChange} />
            <div className="max-h-96 overflow-auto border border-quack-dark border-opacity-10 rounded">
              <ChartViewer config={chartConfig} result={result} />
            </div>
          </div>
        ) : (
          <div className="max-h-96 overflow-auto border border-quack-dark border-opacity-10 rounded">
            <ResultTable result={result} />
          </div>
        )}
      </CollapsibleContent>
    </div>
  );
}
