import { describe, it, expect } from 'vitest';
import duckdb from 'duckdb';

describe('DuckDB Basic Test', () => {
  it('should create and query a simple in-memory database', async () => {
    const db = new duckdb.Database(':memory:');

    const result = await new Promise<unknown[]>((resolve, reject) => {
      db.all('SELECT 42 as value', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ value: 42 });

    await new Promise<void>((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
});
