import type { ChartConfig } from '@/lib/chart-config';
import type { QueryResult } from '@/hooks/useQuery';
import RechartsChart from './RechartsChart';
import { ChartContainer } from './ui/chart';

interface ChartViewerProps {
  config: ChartConfig;
  result: QueryResult;
}

export function ChartViewer({ config, result }: ChartViewerProps) {
  return (
    <ChartContainer>
      <RechartsChart config={config} result={result} />
    </ChartContainer>
  );
}
