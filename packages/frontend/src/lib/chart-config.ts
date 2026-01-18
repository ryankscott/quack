import type { QueryResult } from '@/hooks/useQuery';

export type ChartType = 'bar' | 'line' | 'scatter' | 'area' | 'pie';
export type AggregationType = 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface ChartConfig {
  type: ChartType;
  xColumn: string;
  yColumn: string;
  colorColumn?: string;
  aggregation: AggregationType;
}

export function getDefaultChartConfig(result: QueryResult): ChartConfig {
  const columns = result.columns.map((c) => c.name);

  const numericColumns = result.columns
    .filter((c) => ['DOUBLE', 'BIGINT', 'INTEGER', 'DECIMAL', 'SMALLINT'].includes(c.type))
    .map((c) => c.name);

  const categoricalColumns = result.columns
    .filter((c) => !['DOUBLE', 'BIGINT', 'INTEGER', 'DECIMAL', 'SMALLINT'].includes(c.type))
    .map((c) => c.name);

  return {
    type: 'bar',
    xColumn: categoricalColumns[0] || columns[0] || '',
    yColumn: numericColumns[0] || columns[1] || columns[0] || '',
    aggregation: 'none',
  };
}
