import type { ChartConfig } from '@/lib/chart-config';
import { pivotDataForGrouping } from '@/lib/chart-config';
import type { QueryResult } from '@/hooks/useQuery';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig as ShadcnChartConfig,
} from '@/components/ui/chart';

// Color palette for chart series
const CHART_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2'];

// Sanitize group names to create valid CSS variable names
function sanitizeGroupName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function rowsToObjects(result: QueryResult): Record<string, any>[] {
  return result.rows.map((row) => {
    const obj: Record<string, any> = {};
    result.columns.forEach((col, idx) => {
      obj[col.name] = row[idx];
    });
    return obj;
  });
}

function transformData(
  data: Record<string, any>[],
  xKey: string,
  yKey: string
): { x: any; y: number }[] {
  return data.map((d) => ({ x: d[xKey], y: Number(d[yKey]) || 0 }));
}

interface RechartsChartProps {
  config: ChartConfig;
  result: QueryResult;
  /** Use fixed dimensions instead of ResponsiveContainer (needed for image export) */
  fixedSize?: { width: number; height: number };
}

export default function RechartsChart({
  config,
  result,
  fixedSize,
}: RechartsChartProps) {
  const dataObjects = rowsToObjects(result);

  // Check if we need to pivot data for grouping
  const hasGrouping = config.groupColumn && (config.type === 'bar' || config.type === 'area');

  let data: Record<string, any>[];
  let groups: string[] = [];
  let shadcnConfig: ShadcnChartConfig;

  if (hasGrouping && config.groupColumn) {
    // Pivot data for grouped charts
    const pivoted = pivotDataForGrouping(
      dataObjects,
      config.xColumn,
      config.yColumn,
      config.groupColumn
    );
    data = pivoted.data;
    groups = pivoted.groups;

    // Build shadcn config with colors for each group
    // Use sanitized group names as CSS variable keys
    shadcnConfig = {};
    groups.forEach((group, idx) => {
      const sanitizedKey = sanitizeGroupName(group);
      shadcnConfig[sanitizedKey] = {
        label: group, // Use original name for label
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
    });
  } else {
    // Transform data normally for non-grouped charts
    data = transformData(dataObjects, config.xColumn, config.yColumn);

    // Build shadcn chart config for CSS variable injection
    // Use 'y' as the key since that's what we use in the transformed data
    shadcnConfig = {
      y: {
        label: config.seriesConfig.label,
        color: config.seriesConfig.color,
      },
    };
  }

  const width = fixedSize?.width;
  const height = fixedSize?.height ?? 400;

  // For pie charts, we need different config
  if (config.type === 'pie') {
    const pieData = data.map((d) => ({ name: String(d.x), value: d.y }));

    // Build config for each pie slice
    const pieConfig: ShadcnChartConfig = {};
    pieData.forEach((item, idx) => {
      pieConfig[item.name] = {
        label: item.name,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
    });

    const commonProps = {
      width,
      height,
    };

    const pieChart = (
      <PieChart {...commonProps} accessibilityLayer>
        <ChartTooltip content={<ChartTooltipContent />} />
        {config.showLegend && <ChartLegend content={<ChartLegendContent />} />}
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          outerRadius={150}
        >
          {pieData.map((entry, idx) => (
            <Cell key={`cell-${idx}`} fill={`var(--color-${entry.name})`} />
          ))}
        </Pie>
      </PieChart>
    );

    if (fixedSize) {
      return (
        <div style={{ width: fixedSize.width, height: fixedSize.height }}>
          <ChartContainer config={pieConfig} className="h-full w-full">
            {pieChart}
          </ChartContainer>
        </div>
      );
    }

    return (
      <ChartContainer config={pieConfig} className="h-[400px] w-full p-2">
        {pieChart}
      </ChartContainer>
    );
  }

  // For all other chart types
  const chartContent = () => {
    const commonProps = {
      width,
      height,
    };

    switch (config.type) {
      case 'bar':
        return (
          <BarChart data={data} {...commonProps} accessibilityLayer>
            <XAxis
              dataKey="x"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              label={config.xAxisTitle ? { value: config.xAxisTitle, position: 'bottom' } : undefined}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              label={config.yAxisTitle ? { value: config.yAxisTitle, angle: -90, position: 'insideLeft' } : undefined}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {config.showLegend && <ChartLegend content={<ChartLegendContent />} />}
            {hasGrouping && groups.length > 0 ? (
              // Render stacked bars for grouped data
              groups.map((group) => (
                <Bar
                  key={group}
                  dataKey={group}
                  stackId="stack"
                  fill={`var(--color-${sanitizeGroupName(group)})`}
                  radius={4}
                  name={group}
                />
              ))
            ) : (
              // Render single bar for non-grouped data
              <Bar dataKey="y" fill="var(--color-y)" radius={4} name={config.seriesConfig.label} />
            )}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={data} {...commonProps} accessibilityLayer>
            <XAxis
              dataKey="x"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              label={config.xAxisTitle ? { value: config.xAxisTitle, position: 'bottom' } : undefined}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              label={config.yAxisTitle ? { value: config.yAxisTitle, angle: -90, position: 'insideLeft' } : undefined}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {config.showLegend && <ChartLegend content={<ChartLegendContent />} />}
            <Line
              type="monotone"
              dataKey="y"
              stroke="var(--color-y)"
              dot={false}
              name={config.seriesConfig.label}
            />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data} {...commonProps} accessibilityLayer>
            <XAxis
              dataKey="x"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              label={config.xAxisTitle ? { value: config.xAxisTitle, position: 'bottom' } : undefined}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              label={config.yAxisTitle ? { value: config.yAxisTitle, angle: -90, position: 'insideLeft' } : undefined}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {config.showLegend && <ChartLegend content={<ChartLegendContent />} />}
            {hasGrouping && groups.length > 0 ? (
              // Render stacked areas for grouped data
              groups.map((group) => (
                <Area
                  key={group}
                  type="monotone"
                  dataKey={group}
                  stackId="stack"
                  stroke={`var(--color-${sanitizeGroupName(group)})`}
                  fill={`var(--color-${sanitizeGroupName(group)})`}
                  fillOpacity={0.6}
                  name={group}
                />
              ))
            ) : (
              // Render single area for non-grouped data
              <Area
                type="monotone"
                dataKey="y"
                stroke="var(--color-y)"
                fill="var(--color-y)"
                fillOpacity={0.2}
                name={config.seriesConfig.label}
              />
            )}
          </AreaChart>
        );
      case 'scatter':
        return (
          <ScatterChart {...commonProps} accessibilityLayer>
            <XAxis
              dataKey="x"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              label={config.xAxisTitle ? { value: config.xAxisTitle, position: 'bottom' } : undefined}
            />
            <YAxis
              dataKey="y"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              label={config.yAxisTitle ? { value: config.yAxisTitle, angle: -90, position: 'insideLeft' } : undefined}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {config.showLegend && <ChartLegend content={<ChartLegendContent />} />}
            <Scatter data={data} fill="var(--color-y)" name={config.seriesConfig.label} />
          </ScatterChart>
        );
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  const content = chartContent();
  if (!content) {
    return null;
  }

  // If using fixed size, render chart directly without ChartContainer's ResponsiveContainer
  if (fixedSize) {
    return (
      <div style={{ width: fixedSize.width, height: fixedSize.height }}>
        <ChartContainer config={shadcnConfig} className="h-full w-full">
          {content}
        </ChartContainer>
      </div>
    );
  }

  // Use ChartContainer for normal display (includes ResponsiveContainer)
  return (
    <ChartContainer config={shadcnConfig} className="h-[400px] w-full p-2">
      {content}
    </ChartContainer>
  );
}
