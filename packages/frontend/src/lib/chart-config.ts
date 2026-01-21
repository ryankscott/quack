import type { QueryResult } from '@/hooks/useQuery';

export type ChartType = 'bar' | 'line' | 'scatter' | 'area' | 'pie';

export interface SeriesConfig {
  label: string;      // Display name in legend/tooltip
  color: string;      // Hex color like "#2563eb"
}

export interface ChartConfig {
  type: ChartType;
  xColumn: string;
  yColumn: string;
  xAxisTitle?: string;              // X axis label
  yAxisTitle?: string;              // Y axis label  
  showLegend: boolean;              // Toggle legend visibility
  seriesConfig: SeriesConfig;       // Series name and color
}

export interface ChartConfigOptions {
  showXAxisTitle: boolean;
  showYAxisTitle: boolean;
  xColumnLabel: string;
  yColumnLabel: string;
}

/**
 * Returns which configuration options are applicable for a given chart type
 */
export function getConfigOptionsForChartType(type: ChartType): ChartConfigOptions {
  switch (type) {
    case 'pie':
      return {
        showXAxisTitle: false,
        showYAxisTitle: false,
        xColumnLabel: 'Category',
        yColumnLabel: 'Value',
      };
    case 'bar':
    case 'line':
    case 'area':
    case 'scatter':
      return {
        showXAxisTitle: true,
        showYAxisTitle: true,
        xColumnLabel: 'X Axis Column',
        yColumnLabel: 'Y Axis Column',
      };
    default:
      return {
        showXAxisTitle: true,
        showYAxisTitle: true,
        xColumnLabel: 'X Axis Column',
        yColumnLabel: 'Y Axis Column',
      };
  }
}

export function getDefaultChartConfig(result: QueryResult): ChartConfig {
  const columns = result.columns.map((c) => c.name);

  const numericColumns = result.columns
    .filter((c) => ['DOUBLE', 'BIGINT', 'INTEGER', 'DECIMAL', 'SMALLINT'].includes(c.type))
    .map((c) => c.name);

  const categoricalColumns = result.columns
    .filter((c) => !['DOUBLE', 'BIGINT', 'INTEGER', 'DECIMAL', 'SMALLINT'].includes(c.type))
    .map((c) => c.name);

  const defaultYColumn = numericColumns[0] || columns[1] || columns[0] || '';
  
  return {
    type: 'bar',
    xColumn: categoricalColumns[0] || columns[0] || '',
    yColumn: defaultYColumn,
    showLegend: true,
    seriesConfig: {
      label: defaultYColumn || 'Value',
      color: '#2563eb',
    },
  };
}
