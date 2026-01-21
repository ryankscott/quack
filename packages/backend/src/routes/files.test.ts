import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../server.js';
import { FastifyInstance } from 'fastify';
import dbConnection from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { generateFileId } from '../utils/csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('File and Table Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    await dbConnection.initialize();
    await initializeSchema();
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
    await dbConnection.close();
  });

  it('should list files endpoint exist', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/files',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('files');
    expect(Array.isArray(body.files)).toBe(true);
  });

  it('should reject non-existent file for table creation', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/tables',
      payload: {
        file_id: 'does_not_exist',
        table_name: 'test_data',
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should reject invalid table names', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/tables',
      payload: {
        file_id: 'some_file_id',
        table_name: 'invalid table name!',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should reject missing file_id', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/tables',
      payload: {
        table_name: 'test',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should list tables endpoint work', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/tables',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('tables');
    expect(Array.isArray(body.tables)).toBe(true);
  });

  describe('Append functionality', () => {
    let testFileId1: string;
    let testFileId2: string;
    let testFilePath1: string;
    let testFilePath2: string;
    const testTableName = 'test_append_table';

    beforeAll(async () => {
      // Create test CSV files
      const csvContent1 = 'id,name\n1,Alice\n2,Bob\n';
      const csvContent2 = 'id,name\n3,Charlie\n4,Diana\n';

      const uploadDir = join(__dirname, '../../..', 'data', 'uploads');
      await mkdir(uploadDir, { recursive: true });

      testFileId1 = generateFileId();
      testFileId2 = generateFileId();

      testFilePath1 = join(uploadDir, `${testFileId1}_test1.csv`);
      testFilePath2 = join(uploadDir, `${testFileId2}_test2.csv`);

      await writeFile(testFilePath1, csvContent1);
      await writeFile(testFilePath2, csvContent2);

      // Insert file records directly into database
      await dbConnection.run(
        'INSERT INTO _files (id, filename, path) VALUES (?, ?, ?)',
        testFileId1,
        'test1.csv',
        testFilePath1
      );

      await dbConnection.run(
        'INSERT INTO _files (id, filename, path) VALUES (?, ?, ?)',
        testFileId2,
        'test2.csv',
        testFilePath2
      );
    });

    afterAll(async () => {
      // Clean up test files
      try {
        await unlink(testFilePath1);
        await unlink(testFilePath2);
      } catch (_err) {
        // Files may not exist
      }

      // Clean up test table
      try {
        await dbConnection.run(`DROP TABLE IF EXISTS "${testTableName}"`);
      } catch (_err) {
        // Table may not exist
      }
    });

    it('should create a table from CSV', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/tables',
        payload: {
          file_id: testFileId1,
          table_name: testTableName,
          mode: 'create',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.table_name).toBe(testTableName);

      // Verify table has data
      const rows = await dbConnection.query(`SELECT * FROM "${testTableName}"`);
      expect(rows.length).toBe(2);
    });

    it('should append data to existing table', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/tables',
        payload: {
          file_id: testFileId2,
          table_name: '', // Not used in append mode
          mode: 'append',
          target_table: testTableName,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.table_name).toBe(testTableName);

      // Verify table has more data
      const rows = await dbConnection.query(`SELECT * FROM "${testTableName}"`);
      expect(rows.length).toBe(4);
    });

    it('should reject append to non-existent table', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/tables',
        payload: {
          file_id: testFileId1,
          table_name: '',
          mode: 'append',
          target_table: 'non_existent_table',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Target table not found');
    });

    it('should reject append without target_table', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/tables',
        payload: {
          file_id: testFileId1,
          table_name: '',
          mode: 'append',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('target_table is required');
    });
  });

  describe('Schema endpoint', () => {
    const testTableName = 'test_schema_table';

    beforeAll(async () => {
      // Create a test table
      await dbConnection.run(
        `CREATE TABLE IF NOT EXISTS "${testTableName}" (id INTEGER, name TEXT, age INTEGER)`
      );
    });

    afterAll(async () => {
      // Clean up test table
      try {
        await dbConnection.run(`DROP TABLE IF EXISTS "${testTableName}"`);
      } catch (_err) {
        // Table may not exist
      }
    });

    it('should return table schema', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/tables/${testTableName}/schema`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('columns');
      expect(Array.isArray(body.columns)).toBe(true);
      expect(body.columns.length).toBe(3);

      const columnNames = body.columns.map((col: { name: string }) => col.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('age');
    });

    it('should reject invalid table name', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/tables/invalid-table-name!/schema',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent table', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/tables/non_existent_table/schema',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
