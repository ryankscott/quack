import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { queryRoutes } from './query.js';
import dbConnection from '../db/connection.js';

describe('Save Query to Table Route', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = Fastify();
    await server.register(queryRoutes);

    // Create test table with sample data
    await dbConnection.run(`
      CREATE TABLE IF NOT EXISTS test_data (
        id INTEGER,
        name VARCHAR,
        value INTEGER
      )
    `);
    await dbConnection.run(`
      INSERT INTO test_data VALUES 
        (1, 'Alice', 100),
        (2, 'Bob', 200),
        (3, 'Charlie', 300)
    `);
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
    await dbConnection.run('DROP TABLE IF EXISTS test_data');
    await dbConnection.run('DROP TABLE IF EXISTS saved_results');
    await dbConnection.run('DROP TABLE IF EXISTS filtered_data');
    await dbConnection.close();
  });

  it('should create a new table from query results', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/query/save-to-table',
      payload: {
        sql: 'SELECT * FROM test_data WHERE value > 150',
        table_name: 'filtered_data',
        description: 'Filtered test data',
        allowed_tables: ['test_data'],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.table_name).toBe('filtered_data');
    expect(body.row_count).toBe(2);

    // Verify table was created
    const rows = await dbConnection.query('SELECT * FROM filtered_data ORDER BY id');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 2, name: 'Bob', value: 200 });
    expect(rows[1]).toMatchObject({ id: 3, name: 'Charlie', value: 300 });

    // Verify description was set
    const commentResult = await dbConnection.query(`
      SELECT comment FROM duckdb_tables() WHERE table_name = 'filtered_data'
    `);
    expect(commentResult[0]?.comment).toBe('Filtered test data');

    // Verify metadata was inserted into _tables
    const metadataResult = await dbConnection.query(
      "SELECT name, source_file_id FROM _tables WHERE name = 'filtered_data'"
    );
    expect(metadataResult).toHaveLength(1);
    expect(metadataResult[0]).toMatchObject({
      name: 'filtered_data',
      source_file_id: null, // Should be null for query-generated tables
    });
  });

  it('should reject missing SQL', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/query/save-to-table',
      payload: {
        table_name: 'test_table',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('SQL is required');
  });

  it('should reject missing table_name', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/query/save-to-table',
      payload: {
        sql: 'SELECT * FROM test_data',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('table_name is required');
  });

  it('should reject invalid table names', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/query/save-to-table',
      payload: {
        sql: 'SELECT * FROM test_data',
        table_name: 'invalid-name',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Invalid table name');
  });

  it('should reject if table already exists', async () => {
    // First create a table
    await server.inject({
      method: 'POST',
      url: '/query/save-to-table',
      payload: {
        sql: 'SELECT * FROM test_data',
        table_name: 'saved_results',
        allowed_tables: ['test_data'],
      },
    });

    // Try to create the same table again
    const response = await server.inject({
      method: 'POST',
      url: '/query/save-to-table',
      payload: {
        sql: 'SELECT * FROM test_data',
        table_name: 'saved_results',
        allowed_tables: ['test_data'],
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('already exists');
  });

  it('should validate allowed_tables', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/query/save-to-table',
      payload: {
        sql: 'SELECT * FROM test_data',
        table_name: 'unauthorized_table',
        allowed_tables: ['other_table'],
      },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.error).toBeTruthy();
  });

  it('should handle SQL syntax errors', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/query/save-to-table',
      payload: {
        sql: 'INVALID SQL SYNTAX',
        table_name: 'error_table',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBeTruthy();
  });
});
