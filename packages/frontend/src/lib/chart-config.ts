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
  groupColumn?: string;             // Group by column for stacked charts
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
  supportsGrouping: boolean;        // Whether this chart type supports grouping
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
        supportsGrouping: false,
      };
    case 'bar':
    case 'area':
      return {
        showXAxisTitle: true,
        showYAxisTitle: true,
        xColumnLabel: 'X Axis Column',
        yColumnLabel: 'Y Axis Column',
        supportsGrouping: true,
      };
    case 'line':
    case 'scatter':
      return {
        showXAxisTitle: true,
        showYAxisTitle: true,
        xColumnLabel: 'X Axis Column',
        yColumnLabel: 'Y Axis Column',
        supportsGrouping: false,
      };
    default:
      return {
        showXAxisTitle: true,
        showYAxisTitle: true,
        xColumnLabel: 'X Axis Column',
        yColumnLabel: 'Y Axis Column',
        supportsGrouping: false,
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
    groupColumn: undefined,
    showLegend: true,
    seriesConfig: {
      label: defaultYColumn || 'Value',
      color: '#2563eb',
    },
  };
}

/**
 * Pivots data for grouped/stacked charts
 * Input: [{ x: 'Jan', y: 100, group: 'East' }, { x: 'Jan', y: 200, group: 'West' }]
 * Output: [{ x: 'Jan', East: 100, West: 200 }]
 */
export function pivotDataForGrouping(
  data: Record<string, any>[],
  xKey: string,
  yKey: string,
  groupKey: string
): { data: Record<string, any>[]; groups: string[] } {
  const pivoted = new Map<string, Record<string, any>>();
  const groupSet = new Set<string>();

  for (const row of data) {
    const xValue = row[xKey];
    const yValue = Number(row[yKey]) || 0;
    const groupValue = row[groupKey] != null ? String(row[groupKey]) : 'Unknown';

    groupSet.add(groupValue);

    if (!pivoted.has(xValue)) {
      pivoted.set(xValue, { x: xValue });
    }

    const pivotedRow = pivoted.get(xValue)!;
    pivotedRow[groupValue] = yValue;
  }

  const groups = Array.from(groupSet).sort();
  const result = Array.from(pivoted.values());

  // Fill missing group values with 0
  for (const row of result) {
    for (const group of groups) {
      if (row[group] === undefined) {
        row[group] = 0;
      }
    }
  }

  return { data: result, groups };
}
