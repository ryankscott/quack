import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import dbConnection from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';

describe('Query Execution Route', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    await dbConnection.initialize();
    await initializeSchema();

    // Seed sample tables for join tests
    await dbConnection.run('CREATE TABLE IF NOT EXISTS users (id INTEGER, name TEXT)');
    await dbConnection.run('CREATE TABLE IF NOT EXISTS orders (user_id INTEGER, amount INTEGER)');
    await dbConnection.run('DELETE FROM users');
    await dbConnection.run('DELETE FROM orders');
    await dbConnection.run("INSERT INTO users VALUES (1, 'alice'), (2, 'bob')");
    await dbConnection.run('INSERT INTO orders VALUES (1, 50), (1, 75), (2, 20)');

    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
    await dbConnection.run('DROP TABLE IF EXISTS orders');
    await dbConnection.run('DROP TABLE IF EXISTS users');
    await dbConnection.close();
  });

  it('executes a simple SELECT query', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/query/execute',
      payload: { sql: 'SELECT 1 as value' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('result');
    expect(body.result.columns[0]?.name).toBe('value');
    expect(body.result.rows[0]?.[0]).toBe(1);
    expect(body.result.truncated).toBe(false);
    expect(body.result.rowCount).toBe(1);
  });

  it('enforces row limit and reports truncation', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/query/execute',
      payload: { sql: 'SELECT * FROM range(0, 2000)', limit: 50 },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.result.rows).toHaveLength(50);
    expect(body.result.truncated).toBe(true);
    expect(body.result.rowCount).toBe(2000);
  });

  it('handles SQL syntax errors with 400', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/query/execute',
      payload: { sql: 'SELECT FROM' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBeDefined();
  });

  it('supports joins across tables', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/query/execute',
      payload: {
        sql: `
          SELECT u.name, o.amount
          FROM users u
          JOIN orders o ON u.id = o.user_id
          ORDER BY o.amount DESC
        `,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.result.rows.length).toBeGreaterThan(0);
    expect(body.result.columns.map((c: { name: string }) => c.name)).toEqual(['name', 'amount']);
    expect(body.result.rowCount).toBe(3);
    expect(body.result.truncated).toBe(false);
  });

  describe('Table validation', () => {
    it('allows query when table is in allowed_tables', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/query/execute',
        payload: {
          sql: 'SELECT * FROM users',
          allowed_tables: ['users'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('result');
    });

    it('rejects query when table is not in allowed_tables', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/query/execute',
        payload: {
          sql: 'SELECT * FROM users',
          allowed_tables: ['orders'],
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('users');
      expect(body.error).toContain('not selected');
    });

    it('rejects query when no tables are selected', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/query/execute',
        payload: {
          sql: 'SELECT * FROM users',
          allowed_tables: [],
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('No tables are selected');
    });

    it('allows queries without table references even with empty allowed_tables', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/query/execute',
        payload: {
          sql: 'SELECT 1 as value',
          allowed_tables: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('result');
    });

    it('validates multiple tables in JOIN', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/query/execute',
        payload: {
          sql: 'SELECT * FROM users JOIN orders ON users.id = orders.user_id',
          allowed_tables: ['users', 'orders'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('result');
    });

    it('rejects when one table in JOIN is not allowed', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/query/execute',
        payload: {
          sql: 'SELECT * FROM users JOIN orders ON users.id = orders.user_id',
          allowed_tables: ['users'],
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('orders');
    });

    it('works without allowed_tables (backward compatibility)', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/query/execute',
        payload: {
          sql: 'SELECT * FROM users',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('result');
    });
  });
});
