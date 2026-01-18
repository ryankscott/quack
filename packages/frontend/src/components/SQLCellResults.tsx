import { useState } from 'react';
import { ResultTable } from './ResultTable';
import { ChartViewer } from './ChartViewer';
import { ChartConfigPanel } from './ChartConfig';
import { Button } from './ui/button';
import type { QueryResult } from '@/hooks/useQuery';
import type { ChartConfig } from '@/lib/chart-config';

interface SQLCellResultsProps {
  result: QueryResult;
  chartConfig: ChartConfig | null;
  onChartConfigChange: (config: ChartConfig) => void;
}

/**
 * Results section of SQL cell with table/chart toggle and display
 */
export function SQLCellResults({ result, chartConfig, onChartConfigChange }: SQLCellResultsProps) {
  const [showChart, setShowChart] = useState(false);

  return (
    <div className="p-4 pt-0">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-quack-dark text-opacity-70">
          {result.rowCount.toLocaleString()} row{result.rowCount !== 1 ? 's' : ''} returned
          {result.truncated && ' (truncated)'}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowChart(false)}
            variant={!showChart ? 'default' : 'outline'}
            size="sm"
          >
            Table
          </Button>
          <Button
            onClick={() => setShowChart(true)}
            variant={showChart ? 'default' : 'outline'}
            size="sm"
          >
            Chart
          </Button>
        </div>
      </div>

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
    </div>
  );
}
