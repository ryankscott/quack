

export interface TableReference {
  table: string;
  alias?: string;
}

/**
 * Extract CTE (Common Table Expression) names from SQL query
 * Handles: WITH name AS, WITH RECURSIVE name AS, , name AS (for multiple CTEs)
 */
function extractCTENames(sql: string): Set<string> {
  const cteNames = new Set<string>();
  // Match WITH name AS or , name AS patterns
  // Handles: WITH yearly AS, WITH RECURSIVE yearly AS, , monthly AS
  const ctePattern = /(?:WITH(?:\s+RECURSIVE)?|,)\s+(\w+)\s+AS\s*\(/gi;
  let match;
  while ((match = ctePattern.exec(sql)) !== null) {
    if (match[1]) {
      cteNames.add(match[1].toLowerCase());
    }
  }
  return cteNames;
}

/**
 * Extract all table references from a SQL query using regex
 * This is more reliable than AST parsing for our use case
 * Excludes CTE names since they are defined within the query itself
 */
export function extractTableReferences(sql: string): string[] {
  const tables = new Set<string>();
  const normalizedSql = sql.replace(/\s+/g, ' ').trim();

  // First, extract CTE names to exclude them
  const cteNames = extractCTENames(normalizedSql);

  // Match FROM table_name, FROM "table_name", FROM 'table_name', FROM `table_name`
  // Handles: FROM users, FROM "users", FROM 'users', FROM users AS u, FROM users u
  // Excludes FROM inside function calls like EXTRACT(YEAR FROM date)
  const fromPattern = /FROM\s+(?:["'`]?)(\w+)(?:["'`]?)(?:\s+(?:AS\s+)?\w+)?/gi;
  let match;
  while ((match = fromPattern.exec(normalizedSql)) !== null) {
    // Get the position of the match to check context
    const matchIndex = match.index;
    const beforeMatch = normalizedSql.substring(Math.max(0, matchIndex - 50), matchIndex + match[0].length);
    
    // Skip if FROM is part of a function call (preceded by function keywords)
    // Check for common SQL functions that use FROM in their syntax
    // Pattern: function_name(... FROM column_name)
    const functionPattern = /\b(EXTRACT|YEAR|MONTH|DAY|DATE|TIME)\s*\([^)]*\s+FROM\s+\w+/i;
    const isInFunction = functionPattern.test(beforeMatch);
    
    if (!isInFunction && match[1] && !['SELECT', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT'].includes(match[1].toUpperCase())) {
      tables.add(match[1]);
    }
  }

  // Match JOIN table_name, JOIN "table_name", etc.
  // Handles: JOIN orders, JOIN "orders", JOIN orders o, JOIN orders AS o
  const joinPattern = /(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+(?:["'`]?)(\w+)(?:["'`]?)(?:\s+(?:AS\s+)?\w+)?/gi;
  while ((match = joinPattern.exec(normalizedSql)) !== null) {
    if (match[1] && !['ON', 'USING'].includes(match[1].toUpperCase())) {
      tables.add(match[1]);
    }
  }

  // Filter out CTE names
  return Array.from(tables).filter((t) => !cteNames.has(t.toLowerCase()));
}

/**
 * Validate that all tables referenced in SQL are in the allowed list
 */
export function validateTableAccess(sql: string, allowedTables: string[]): { valid: boolean; error?: string } {
  if (allowedTables.length === 0) {
    return {
      valid: false,
      error: 'No tables are selected for this cell. Please select at least one table.',
    };
  }

  const referencedTables = extractTableReferences(sql);

  if (referencedTables.length === 0) {
    // Queries without table references (e.g., SELECT 1) are allowed
    return { valid: true };
  }

  const allowedSet = new Set(allowedTables.map((t) => t.toLowerCase()));
  const unauthorized = referencedTables.filter((table) => !allowedSet.has(table.toLowerCase()));

  if (unauthorized.length > 0) {
    const tableList = unauthorized.map((t) => `'${t}'`).join(', ');
    return {
      valid: false,
      error: `Query references table(s) ${tableList} which are not selected for this cell. Please select these tables or modify your query.`,
    };
  }

  return { valid: true };
}
