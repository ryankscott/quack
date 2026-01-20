/**
 * SQL Template System
 * 
 * Provides predefined SQL query templates with tabstop placeholders
 * for common patterns that are difficult to remember or write from scratch.
 */

export interface SQLTemplateVariable {
  name: string;
  description: string;
  default?: string;
}

export interface SQLTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  variables: SQLTemplateVariable[];
  template: string;
}

/**
 * Built-in SQL templates organized by category
 */
export const SQL_TEMPLATES: SQLTemplate[] = [
  // Window Functions
  {
    id: 'top-n-by-category',
    name: 'Top N by Category',
    description: 'Get top N rows within each category using ROW_NUMBER()',
    category: 'Window Functions',
    variables: [
      { name: 'table', description: 'Source table' },
      { name: 'category_column', description: 'Column to partition by' },
      { name: 'value_column', description: 'Column to order by' },
      { name: 'n', description: 'Number of top rows', default: '5' },
    ],
    template: `WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY \${1:category_column} ORDER BY \${2:value_column} DESC) as rn
  FROM \${3:table}
)
SELECT * FROM ranked WHERE rn <= \${4:5}`,
  },
  {
    id: 'running-total',
    name: 'Running Total',
    description: 'Calculate cumulative sum using window functions',
    category: 'Window Functions',
    variables: [
      { name: 'table', description: 'Source table' },
      { name: 'value_column', description: 'Column to sum' },
      { name: 'order_column', description: 'Column to order by' },
    ],
    template: `SELECT *,
  SUM(\${1:value_column}) OVER (ORDER BY \${2:order_column}) as running_total
FROM \${3:table}
ORDER BY \${2:order_column}`,
  },
  {
    id: 'moving-average',
    name: 'Moving Average',
    description: 'Calculate moving average over a window of rows',
    category: 'Window Functions',
    variables: [
      { name: 'table', description: 'Source table' },
      { name: 'value_column', description: 'Column to average' },
      { name: 'order_column', description: 'Column to order by' },
      { name: 'window_size', description: 'Number of rows in window', default: '7' },
    ],
    template: `SELECT *,
  AVG(\${1:value_column}) OVER (
    ORDER BY \${2:order_column}
    ROWS BETWEEN \${4:6} PRECEDING AND CURRENT ROW
  ) as moving_avg
FROM \${3:table}
ORDER BY \${2:order_column}`,
  },
  {
    id: 'percentile',
    name: 'Percentile',
    description: 'Calculate percentile using PERCENTILE_CONT or PERCENTILE_DISC',
    category: 'Window Functions',
    variables: [
      { name: 'table', description: 'Source table' },
      { name: 'value_column', description: 'Column to calculate percentile for' },
      { name: 'percentile', description: 'Percentile value (0.0 to 1.0)', default: '0.5' },
    ],
    template: `SELECT *,
  PERCENTILE_CONT(\${3:0.5}) WITHIN GROUP (ORDER BY \${1:value_column}) OVER () as percentile_value
FROM \${2:table}`,
  },

  // Grouping Sets
  {
    id: 'rollup',
    name: 'ROLLUP',
    description: 'Generate subtotals and grand total using ROLLUP',
    category: 'Grouping Sets',
    variables: [
      { name: 'table', description: 'Source table' },
      { name: 'group_column1', description: 'First grouping column' },
      { name: 'group_column2', description: 'Second grouping column' },
      { name: 'aggregate_column', description: 'Column to aggregate' },
    ],
    template: `SELECT \${1:group_column1}, \${2:group_column2},
  SUM(\${3:aggregate_column}) as total
FROM \${4:table}
GROUP BY ROLLUP(\${1:group_column1}, \${2:group_column2})
ORDER BY \${1:group_column1}, \${2:group_column2}`,
  },
  {
    id: 'cube',
    name: 'CUBE',
    description: 'Generate all possible grouping combinations using CUBE',
    category: 'Grouping Sets',
    variables: [
      { name: 'table', description: 'Source table' },
      { name: 'group_column1', description: 'First grouping column' },
      { name: 'group_column2', description: 'Second grouping column' },
      { name: 'aggregate_column', description: 'Column to aggregate' },
    ],
    template: `SELECT \${1:group_column1}, \${2:group_column2},
  SUM(\${3:aggregate_column}) as total
FROM \${4:table}
GROUP BY CUBE(\${1:group_column1}, \${2:group_column2})
ORDER BY \${1:group_column1}, \${2:group_column2}`,
  },
  {
    id: 'grouping-sets',
    name: 'GROUPING SETS',
    description: 'Specify multiple grouping sets explicitly',
    category: 'Grouping Sets',
    variables: [
      { name: 'table', description: 'Source table' },
      { name: 'group_column1', description: 'First grouping column' },
      { name: 'group_column2', description: 'Second grouping column' },
      { name: 'aggregate_column', description: 'Column to aggregate' },
    ],
    template: `SELECT \${1:group_column1}, \${2:group_column2},
  SUM(\${3:aggregate_column}) as total
FROM \${4:table}
GROUP BY GROUPING SETS (
  (\${1:group_column1}),
  (\${2:group_column2}),
  (\${1:group_column1}, \${2:group_column2}),
  ()
)
ORDER BY \${1:group_column1}, \${2:group_column2}`,
  },

  // Common Patterns
  {
    id: 'deduplicate',
    name: 'Deduplicate Rows',
    description: 'Remove duplicate rows keeping the first occurrence',
    category: 'Common Patterns',
    variables: [
      { name: 'table', description: 'Source table' },
      { name: 'key_column', description: 'Column(s) to identify duplicates' },
    ],
    template: `WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY \${1:key_column} ORDER BY \${1:key_column}) as rn
  FROM \${2:table}
)
SELECT * FROM ranked WHERE rn = 1`,
  },
  {
    id: 'year-over-year',
    name: 'Year-over-Year Comparison',
    description: 'Compare values between current and previous year',
    category: 'Analytics',
    variables: [
      { name: 'table', description: 'Source table' },
      { name: 'date_column', description: 'Date column' },
      { name: 'value_column', description: 'Value column to compare' },
    ],
    template: `WITH yearly AS (
  SELECT 
    EXTRACT(YEAR FROM \${2:date_column}) as year,
    SUM(\${3:value_column}) as total
  FROM \${1:table}
  GROUP BY EXTRACT(YEAR FROM \${2:date_column})
)
SELECT 
  year,
  total as current_year,
  LAG(total) OVER (ORDER BY year) as previous_year,
  total - LAG(total) OVER (ORDER BY year) as yoy_change,
  ((total - LAG(total) OVER (ORDER BY year)) * 100.0 / LAG(total) OVER (ORDER BY year)) as yoy_percent
FROM yearly
ORDER BY year`,
  },
];

/**
 * Get templates grouped by category
 */
export function getTemplatesByCategory(): Record<string, SQLTemplate[]> {
  const grouped: Record<string, SQLTemplate[]> = {};
  for (const template of SQL_TEMPLATES) {
    const category = template.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(template);
  }
  return grouped;
}

/**
 * Find a template by ID
 */
export function getTemplateById(id: string): SQLTemplate | undefined {
  return SQL_TEMPLATES.find((t) => t.id === id);
}
