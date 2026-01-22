import type { ChartConfig, ChartType } from '@/lib/chart-config';
import { getConfigOptionsForChartType } from '@/lib/chart-config';
import type { QueryResult } from '@/hooks/useQuery';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

interface ChartConfigProps {
  config: ChartConfig;
  result: QueryResult;
  onChange: (config: ChartConfig) => void;
  onClose?: () => void;
}

export function ChartConfigPanel({ config, result, onChange, onClose }: ChartConfigProps) {
  const columns = result.columns.map((c) => c.name);
  const configOptions = getConfigOptionsForChartType(config.type);

  const chartTypes: { value: ChartType; label: string }[] = [
    { value: 'bar', label: 'Bar Chart' },
    { value: 'line', label: 'Line Chart' },
    { value: 'scatter', label: 'Scatter Plot' },
    { value: 'area', label: 'Area Chart' },
    { value: 'pie', label: 'Pie Chart' },
  ];

  return (
    <div className="w-80 h-full bg-white border-l border-quack-dark border-opacity-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-quack-dark border-opacity-10">
        <h3 className="text-sm font-semibold text-quack-dark">Chart Configuration</h3>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X size={14} />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
          <TabsTrigger value="advanced" className="flex-1">Advanced</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-4">
            {/* Chart Type */}
            <div className="space-y-2">
              <Label htmlFor="chart-type" className="text-xs font-medium text-quack-dark">
                Type
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

            {/* X Column */}
            <div className="space-y-2">
              <Label htmlFor="x-axis" className="text-xs font-medium text-quack-dark">
                {configOptions.xColumnLabel}
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

            {/* Y Column */}
            <div className="space-y-2">
              <Label htmlFor="y-axis" className="text-xs font-medium text-quack-dark">
                {configOptions.yColumnLabel}
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

            {/* Group By Column - only for charts that support grouping */}
            {configOptions.supportsGrouping && (
              <div className="space-y-2">
                <Label htmlFor="group-column" className="text-xs font-medium text-quack-dark">
                  Group By
                </Label>
                <Select
                  value={config.groupColumn || 'none'}
                  onValueChange={(value) => 
                    onChange({ ...config, groupColumn: value === 'none' ? undefined : value })
                  }
                >
                  <SelectTrigger id="group-column" className="text-sm">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {columns
                      .filter((col) => col !== config.xColumn && col !== config.yColumn)
                      .map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Show Legend */}
            <div className="space-y-2">
              <Label htmlFor="show-legend" className="text-xs font-medium text-quack-dark">
                Show Legend
              </Label>
              <div className="flex items-center h-9">
                <Switch
                  id="show-legend"
                  checked={config.showLegend}
                  onCheckedChange={(checked) => onChange({ ...config, showLegend: checked })}
                />
                <Label htmlFor="show-legend" className="ml-2 text-xs text-quack-dark text-opacity-70">
                  {config.showLegend ? 'On' : 'Off'}
                </Label>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-4">
            {/* X Axis Title - only for non-pie charts */}
            {configOptions.showXAxisTitle && (
              <div className="space-y-2">
                <Label htmlFor="x-axis-title" className="text-xs font-medium text-quack-dark">
                  X Axis Title
                </Label>
                <Input
                  id="x-axis-title"
                  type="text"
                  value={config.xAxisTitle || ''}
                  onChange={(e) => onChange({ ...config, xAxisTitle: e.target.value || undefined })}
                  className="text-sm"
                  placeholder="Optional axis label"
                />
              </div>
            )}

            {/* Y Axis Title - only for non-pie charts */}
            {configOptions.showYAxisTitle && (
              <div className="space-y-2">
                <Label htmlFor="y-axis-title" className="text-xs font-medium text-quack-dark">
                  Y Axis Title
                </Label>
                <Input
                  id="y-axis-title"
                  type="text"
                  value={config.yAxisTitle || ''}
                  onChange={(e) => onChange({ ...config, yAxisTitle: e.target.value || undefined })}
                  className="text-sm"
                  placeholder="Optional axis label"
                />
              </div>
            )}

            {/* Series Name */}
            <div className="space-y-2">
              <Label htmlFor="series-name" className="text-xs font-medium text-quack-dark">
                Series Name
              </Label>
              <Input
                id="series-name"
                type="text"
                value={config.seriesConfig.label}
                onChange={(e) =>
                  onChange({
                    ...config,
                    seriesConfig: { ...config.seriesConfig, label: e.target.value },
                  })
                }
                className="text-sm"
                placeholder="Series Label"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
