import { describe, expect, it } from 'vitest';
import { formatSql } from './format-sql';

describe('formatSql', () => {
  it('formats a select query into readable clauses', () => {
    expect(
      formatSql('select id, name, count(*) from users left join teams on users.team_id = teams.id where active = true order by name')
    ).toBe(
      [
        'SELECT id,',
        '  name,',
        '  count(*)',
        'FROM users',
        'LEFT JOIN teams',
        '  ON users.team_id = teams.id',
        'WHERE active = true',
        'ORDER BY name',
      ].join('\n')
    );
  });

  it('keeps empty input empty', () => {
    expect(formatSql('   ')).toBe('');
  });
});
