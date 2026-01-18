import type { ChartConfig, ChartType, AggregationType } from '@/lib/chart-config';
import type { QueryResult } from '@/hooks/useQuery';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChartConfigProps {
  config: ChartConfig;
  result: QueryResult;
  onChange: (config: ChartConfig) => void;
}

export function ChartConfigPanel({ config, result, onChange }: ChartConfigProps) {
  const columns = result.columns.map((c) => c.name);

  const chartTypes: { value: ChartType; label: string }[] = [
    { value: 'bar', label: 'Bar' },
    { value: 'line', label: 'Line' },
    { value: 'scatter', label: 'Scatter' },
    { value: 'area', label: 'Area' },
    { value: 'pie', label: 'Pie' },
  ];

  const aggregations: { value: AggregationType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' },
  ];

  return (
    <div className="p-4 bg-quack-gold bg-opacity-5 border-b border-quack-dark border-opacity-10">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="space-y-2">
          <Label htmlFor="chart-type" className="text-xs font-medium text-quack-dark">
            Chart Type
          </Label>
          <Select
            value={config.type}
            onValueChange={(value) => onChange({ ...config, type: value as ChartType })}
          >
            <SelectTrigger id="chart-type" className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {chartTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="x-axis" className="text-xs font-medium text-quack-dark">
            X Axis
          </Label>
          <Select
            value={config.xColumn}
            onValueChange={(value) => onChange({ ...config, xColumn: value })}
          >
            <SelectTrigger id="x-axis" className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="y-axis" className="text-xs font-medium text-quack-dark">
            Y Axis
          </Label>
          <Select
            value={config.yColumn}
            onValueChange={(value) => onChange({ ...config, yColumn: value })}
          >
            <SelectTrigger id="y-axis" className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aggregation" className="text-xs font-medium text-quack-dark">
            Aggregation
          </Label>
          <Select
            value={config.aggregation}
            onValueChange={(value) =>
              onChange({ ...config, aggregation: value as AggregationType })
            }
          >
            <SelectTrigger id="aggregation" className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aggregations.map((agg) => (
                <SelectItem key={agg.value} value={agg.value}>
                  {agg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color-by" className="text-xs font-medium text-quack-dark">
            Color By
          </Label>
          <Select
            value={config.colorColumn || 'none'}
            onValueChange={(value) =>
              onChange({ ...config, colorColumn: value === 'none' ? undefined : value })
            }
          >
            <SelectTrigger id="color-by" className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
