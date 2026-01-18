// Charts removed: keep placeholder types and functions to avoid broken imports
export type ChartType = never;
export type AggregationType = never;
export interface ChartConfig {}
export function generateChartSpec(): never {
  throw new Error('Charting has been removed');
}
export function getDefaultChartConfig(): never {
  throw new Error('Charting has been removed');
}
