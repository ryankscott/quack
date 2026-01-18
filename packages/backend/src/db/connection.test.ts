import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import dbConnection from './connection.js';
import { initializeSchema } from './schema.js';

describe('Database Connection', () => {
  beforeAll(async () => {
    await dbConnection.initialize();
  });

  afterAll(async () => {
    await dbConnection.close();
  });

  it('should initialize connection successfully', async () => {
    const result = await dbConnection.query('SELECT 1 as value');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ value: 1 });
  });

  it('should execute queries', async () => {
    await dbConnection.run('CREATE TABLE IF NOT EXISTS test_table (id INTEGER, name TEXT)');
    await dbConnection.run('INSERT INTO test_table VALUES (1, ?)', 'test');

    const rows = await dbConnection.query<{ id: number; name: string }>(
      'SELECT * FROM test_table WHERE id = 1'
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('test');

    // Cleanup
    await dbConnection.run('DROP TABLE IF EXISTS test_table');
  });
});

describe('Database Schema', () => {
  beforeAll(async () => {
    await dbConnection.initialize();
    await initializeSchema();
  });

  afterAll(async () => {
    await dbConnection.close();
  });

  it('should create _files table', async () => {
    const result = await dbConnection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = '_files'
    `);
    expect(result).toHaveLength(1);
  });

  it('should create _tables table', async () => {
    const result = await dbConnection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = '_tables'
    `);
    expect(result).toHaveLength(1);
  });

  it('should create _queries table', async () => {
    const result = await dbConnection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = '_queries'
    `);
    expect(result).toHaveLength(1);
  });
});
