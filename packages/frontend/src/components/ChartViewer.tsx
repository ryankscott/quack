import type { ChartConfig } from '@/lib/chart-config';
import type { QueryResult } from '@/hooks/useQuery';
import RechartsChart from './RechartsChart';

interface ChartViewerProps {
  config: ChartConfig;
  result: QueryResult;
}

export function ChartViewer({ config, result }: ChartViewerProps) {
  return (<div className='w-full h-full p-8'>
    <RechartsChart config={config} result={result} />
  </div>)
}
