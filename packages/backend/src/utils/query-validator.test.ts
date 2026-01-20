import { describe, it, expect } from 'vitest';
import { extractTableReferences, validateTableAccess } from './query-validator.js';

describe('query-validator', () => {
  describe('extractTableReferences', () => {
    it('extracts table from simple SELECT', () => {
      const tables = extractTableReferences('SELECT * FROM users');
      expect(tables).toContain('users');
    });

    it('extracts table with quotes', () => {
      const tables = extractTableReferences('SELECT * FROM "users"');
      expect(tables).toContain('users');
    });

    it('extracts multiple tables from JOIN', () => {
      const tables = extractTableReferences(`
        SELECT * FROM users u
        JOIN orders o ON u.id = o.user_id
      `);
      expect(tables).toContain('users');
      expect(tables).toContain('orders');
    });

    it('handles queries without tables', () => {
      const tables = extractTableReferences('SELECT 1 as value');
      expect(tables).toEqual([]);
    });

    it('handles subqueries', () => {
      const tables = extractTableReferences(`
        SELECT * FROM (
          SELECT * FROM users
        ) AS subquery
      `);
      expect(tables).toContain('users');
    });

    it('handles table aliases', () => {
      const tables = extractTableReferences('SELECT * FROM users AS u');
      expect(tables).toContain('users');
    });
  });

  describe('validateTableAccess', () => {
    it('allows query when table is in allowed list', () => {
      const result = validateTableAccess('SELECT * FROM users', ['users']);
      expect(result.valid).toBe(true);
    });

    it('rejects query when table is not in allowed list', () => {
      const result = validateTableAccess('SELECT * FROM users', ['orders']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('users');
    });

    it('rejects query when no tables are selected', () => {
      const result = validateTableAccess('SELECT * FROM users', []);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No tables are selected');
    });

    it('allows queries without table references', () => {
      const result = validateTableAccess('SELECT 1 as value', ['users']);
      expect(result.valid).toBe(true);
    });

    it('validates multiple tables in JOIN', () => {
      const result = validateTableAccess(
        'SELECT * FROM users JOIN orders ON users.id = orders.user_id',
        ['users', 'orders']
      );
      expect(result.valid).toBe(true);
    });

    it('rejects when one table in JOIN is not allowed', () => {
      const result = validateTableAccess(
        'SELECT * FROM users JOIN orders ON users.id = orders.user_id',
        ['users']
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('orders');
    });

    it('is case-insensitive', () => {
      const result = validateTableAccess('SELECT * FROM Users', ['users']);
      expect(result.valid).toBe(true);
    });

    it('handles multiple unauthorized tables', () => {
      const result = validateTableAccess(
        'SELECT * FROM users JOIN orders ON users.id = orders.user_id',
        ['products']
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('users');
      expect(result.error).toContain('orders');
    });
  });
});
