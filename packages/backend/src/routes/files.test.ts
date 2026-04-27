import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../server.js';
import { FastifyInstance } from 'fastify';
import dbConnection from '../db/connection.js';
import { FILE_CONFIG } from '../config.js';
import { initializeSchema } from '../db/schema.js';
import { access, writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { generateFileId } from '../utils/csv.js';

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

      const uploadDir = FILE_CONFIG.UPLOAD_DIR;
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

  describe('CSV schema inspection and selective imports', () => {
    let schemaFileId: string;
    let schemaFilePath: string;
    const selectiveTableName = 'selected_customer_columns';
    const appendTableName = 'mapped_append_table';

    beforeAll(async () => {
      const csvContent = 'Customer ID,Full Name,Age\n1,Alice,30\n2,Bob,40\n';
      await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });

      schemaFileId = generateFileId();
      schemaFilePath = join(FILE_CONFIG.UPLOAD_DIR, `${schemaFileId}_customers.csv`);

      await writeFile(schemaFilePath, csvContent);
      await dbConnection.run(
        'INSERT INTO _files (id, filename, path) VALUES (?, ?, ?)',
        schemaFileId,
        'customers.csv',
        schemaFilePath
      );
    });

    afterAll(async () => {
      await unlink(schemaFilePath).catch(() => undefined);
      await dbConnection.run(`DROP TABLE IF EXISTS "${selectiveTableName}"`);
      await dbConnection.run(`DROP TABLE IF EXISTS "${appendTableName}"`);
      await dbConnection.run(
        'UPDATE _tables SET source_file_id = NULL WHERE source_file_id = ?',
        schemaFileId
      );
      await dbConnection.run('DELETE FROM _files WHERE id = ?', schemaFileId);
      await dbConnection.run('DELETE FROM _tables WHERE name IN (?, ?)', selectiveTableName, appendTableName);
    });

    it('should inspect CSV columns and preview rows', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/files/${schemaFileId}/schema`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.columns.map((column: { name: string }) => column.name)).toEqual([
        'Customer ID',
        'Full Name',
        'Age',
      ]);
      expect(body.preview_rows).toEqual([
        [1, 'Alice', 30],
        [2, 'Bob', 40],
      ]);
    });

    it('should create a table with selected and renamed CSV columns', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/tables',
        payload: {
          file_id: schemaFileId,
          table_name: selectiveTableName,
          mode: 'create',
          column_mappings: [
            { source_name: 'Customer ID', target_name: 'customer_id' },
            { source_name: 'Full Name', target_name: 'customer_name' },
          ],
        },
      });

      expect(response.statusCode).toBe(200);

      const rows = await dbConnection.query<Record<string, unknown>>(
        `SELECT * FROM "${selectiveTableName}" ORDER BY customer_id`
      );
      expect(rows).toEqual([
        { customer_id: 1n, customer_name: 'Alice' },
        { customer_id: 2n, customer_name: 'Bob' },
      ]);
    });

    it('should append renamed CSV columns into an existing schema-matched table', async () => {
      await dbConnection.run(`DROP TABLE IF EXISTS "${appendTableName}"`);
      await dbConnection.run(`
        CREATE TABLE "${appendTableName}" (
          customer_name TEXT,
          customer_id INTEGER
        )
      `);
      await dbConnection.run(
        'INSERT INTO _tables (id, name, source_file_id) VALUES (?, ?, ?)',
        generateFileId(),
        appendTableName,
        null
      );

      const response = await server.inject({
        method: 'POST',
        url: '/tables',
        payload: {
          file_id: schemaFileId,
          table_name: '',
          mode: 'append',
          target_table: appendTableName,
          column_mappings: [
            { source_name: 'Full Name', target_name: 'customer_name' },
            { source_name: 'Customer ID', target_name: 'customer_id' },
          ],
        },
      });

      expect(response.statusCode).toBe(200);

      const rows = await dbConnection.query<Record<string, unknown>>(
        `SELECT * FROM "${appendTableName}" ORDER BY customer_id`
      );
      expect(rows).toEqual([
        { customer_name: 'Alice', customer_id: 1 },
        { customer_name: 'Bob', customer_id: 2 },
      ]);
    });
  });

  describe('Delete functionality', () => {
    it('should delete uploaded files and clear table source references', async () => {
      const fileId = generateFileId();
      const filePath = join(FILE_CONFIG.UPLOAD_DIR, `${fileId}_delete-me.csv`);
      const tableName = 'table_from_deleted_file';

      await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });
      await writeFile(filePath, 'id,name\n1,Alice\n');
      await dbConnection.run(
        'INSERT INTO _files (id, filename, path) VALUES (?, ?, ?)',
        fileId,
        'delete-me.csv',
        filePath
      );
      await dbConnection.run(
        'INSERT INTO _tables (id, name, source_file_id) VALUES (?, ?, ?)',
        generateFileId(),
        tableName,
        fileId
      );

      const response = await server.inject({
        method: 'DELETE',
        url: `/files/${fileId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ success: true });

      const fileRows = await dbConnection.query('SELECT id FROM _files WHERE id = ?', fileId);
      expect(fileRows).toHaveLength(0);

      const tableRows = await dbConnection.query<{ source_file_id: string | null }>(
        'SELECT source_file_id FROM _tables WHERE name = ?',
        tableName
      );
      expect(tableRows[0]?.source_file_id).toBeNull();
      await expect(access(filePath)).rejects.toBeTruthy();

      await dbConnection.run('DELETE FROM _tables WHERE name = ?', tableName);
    });

    it('should delete tables and remove notebook table selections', async () => {
      const tableName = 'table_to_delete';
      const notebookId = generateFileId();
      const cellId = generateFileId();

      await dbConnection.run(`DROP TABLE IF EXISTS "${tableName}"`);
      await dbConnection.run(`CREATE TABLE "${tableName}" (id INTEGER)`);
      await dbConnection.run(
        'INSERT INTO _tables (id, name, source_file_id) VALUES (?, ?, ?)',
        generateFileId(),
        tableName,
        null
      );
      await dbConnection.run(
        'INSERT INTO _notebooks (id, name, markdown) VALUES (?, ?, ?)',
        notebookId,
        'Notebook with selected table',
        null
      );
      await dbConnection.run(
        `INSERT INTO _notebook_cells
          (id, notebook_id, cell_index, title, cell_type, sql_text, markdown_text, chart_config, selected_tables)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        cellId,
        notebookId,
        0,
        'Explore',
        'sql',
        `SELECT * FROM "${tableName}"`,
        null,
        null,
        JSON.stringify([tableName, 'still_selected'])
      );

      const response = await server.inject({
        method: 'DELETE',
        url: `/tables/${tableName}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ success: true });

      const tableExists = await dbConnection.query<{ count: bigint | number }>(
        `SELECT COUNT(*) as count
         FROM information_schema.tables
         WHERE table_schema = 'main' AND table_name = ?`,
        tableName
      );
      expect(Number(tableExists[0]?.count ?? 0)).toBe(0);

      const metadataRows = await dbConnection.query('SELECT id FROM _tables WHERE name = ?', tableName);
      expect(metadataRows).toHaveLength(0);

      const cellRows = await dbConnection.query<{ selected_tables: string | null }>(
        'SELECT selected_tables FROM _notebook_cells WHERE id = ?',
        cellId
      );
      expect(cellRows[0]?.selected_tables).toBe(JSON.stringify(['still_selected']));

      await dbConnection.run('DELETE FROM _notebook_cells WHERE id = ?', cellId);
      await dbConnection.run('DELETE FROM _notebooks WHERE id = ?', notebookId);
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
