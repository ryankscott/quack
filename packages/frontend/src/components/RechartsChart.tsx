import type { ChartConfig } from '@/lib/chart-config';
import type { QueryResult } from '@/hooks/useQuery';
import {
  ResponsiveContainer,
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
  Tooltip,
  Legend,
} from 'recharts';

function rowsToObjects(result: QueryResult): Record<string, any>[] {
  return result.rows.map((row) => {
    const obj: Record<string, any> = {};
    result.columns.forEach((col, idx) => {
      obj[col.name] = row[idx];
    });
    return obj;
  });
}

function aggregateData(
  data: Record<string, any>[],
  xKey: string,
  yKey: string,
  aggregation: ChartConfig['aggregation']
): { x: any; y: number }[] {
  if (aggregation === 'none') {
    return data.map((d) => ({ x: d[xKey], y: Number(d[yKey]) }));
  }
  const groups = new Map<any, number[]>();
  for (const d of data) {
    const x = d[xKey];
    const y = Number(d[yKey]);
    const arr = groups.get(x) || [];
    arr.push(y);
    groups.set(x, arr);
  }
  const out: { x: any; y: number }[] = [];
  groups.forEach((vals, x) => {
    let y = 0;
    switch (aggregation) {
      case 'sum':
        y = vals.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        y = vals.reduce((a, b) => a + b, 0) / vals.length;
        break;
      case 'count':
        y = vals.length;
        break;
      case 'min':
        y = Math.min(...vals);
        break;
      case 'max':
        y = Math.max(...vals);
        break;
      default:
        y = vals.reduce((a, b) => a + b, 0);
    }
    out.push({ x, y });
  });
  return out;
}

export default function RechartsChart({
  config,
  result,
}: {
  config: ChartConfig;
  result: QueryResult;
}) {
  const dataObjects = rowsToObjects(result);
  const data = aggregateData(dataObjects, config.xColumn, config.yColumn, config.aggregation);

  switch (config.type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="y" fill="#f4a261" />
          </BarChart>
        </ResponsiveContainer>
      );
    case 'line':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="y" stroke="#2a9d8f" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );
    case 'area':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data}>
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="y" stroke="#264653" fill="#e9c46a" />
          </AreaChart>
        </ResponsiveContainer>
      );
    case 'scatter':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <XAxis dataKey="x" />
            <YAxis dataKey="y" />
            <Tooltip />
            <Legend />
            <Scatter data={data} fill="#e76f51" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    case 'pie': {
      const pieData = data.map((d) => ({ name: String(d.x), value: d.y }));
      const colors = ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'];
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={150}>
              {pieData.map((_, idx) => (
                <Cell key={idx} fill={colors[idx % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }
    default:
      return null;
  }
}
