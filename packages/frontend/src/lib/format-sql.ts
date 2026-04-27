const KEYWORD_PHRASES = [
  'UNION ALL',
  'GROUP BY',
  'ORDER BY',
  'INSERT INTO',
  'DELETE FROM',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL JOIN',
  'INNER JOIN',
  'CROSS JOIN',
];

const CLAUSE_BREAKS = [
  'WITH',
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL JOIN',
  'INNER JOIN',
  'CROSS JOIN',
  'JOIN',
  'ON',
  'UNION ALL',
  'UNION',
];

const INDENTED_CLAUSES = new Set(['ON']);

function escapeKeyword(keyword: string): string {
  return keyword.replace(/ /g, '\\s+');
}

function uppercaseKeywords(sql: string): string {
  let formatted = sql;

  for (const keyword of KEYWORD_PHRASES) {
    formatted = formatted.replace(new RegExp(`\\b${escapeKeyword(keyword)}\\b`, 'gi'), keyword);
  }

  return formatted.replace(
    /\b(select|from|where|having|limit|offset|values|update|set|join|on|union|with|and|or|as|into|delete)\b/gi,
    (match) => match.toUpperCase()
  );
}

export function formatSql(sql: string): string {
  const normalized = uppercaseKeywords(sql.replace(/\s+/g, ' ').trim());
  if (!normalized) {
    return '';
  }

  let formatted = normalized;

  for (const clause of CLAUSE_BREAKS) {
    const expression =
      clause === 'JOIN'
        ? /\s*(?<!LEFT\s)(?<!RIGHT\s)(?<!FULL\s)(?<!INNER\s)(?<!CROSS\s)\bJOIN\b\s*/g
        : clause === 'UNION'
          ? /\s*\bUNION\b(?!\s+ALL\b)\s*/g
          : new RegExp(`\\s*\\b${escapeKeyword(clause)}\\b\\s*`, 'g');

    formatted = formatted.replace(expression, `\n${clause} `);
  }

  formatted = formatted
    .replace(/\s*,\s*/g, ',\n  ')
    .replace(/\s+(AND|OR)\s+/g, '\n  $1 ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');

  return formatted
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const trimmed = line.trim();
      const clause = CLAUSE_BREAKS.find((candidate) => trimmed.startsWith(candidate));
      if (clause && INDENTED_CLAUSES.has(clause)) {
        return `  ${trimmed}`;
      }
      if (trimmed.startsWith('AND ') || trimmed.startsWith('OR ')) {
        return `  ${trimmed}`;
      }
      if (/^\s+/.test(line)) {
        return `  ${trimmed}`;
      }
      return trimmed;
    })
    .join('\n');
}
