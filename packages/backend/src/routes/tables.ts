import { FastifyInstance } from 'fastify';
import dbConnection from '../db/connection.js';
import { generateFileId, validateTableName } from '../utils/csv.js';

interface CreateTableRequest {
  file_id: string;
  table_name: string;
}

interface TableMetadata {
  id: string;
  name: string;
  source_file_id: string | null;
  created_at: string;
}

export async function tablesRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /tables - Create table from file
  fastify.post<{ Body: CreateTableRequest }>('/tables', async (request, reply) => {
    const { file_id, table_name } = request.body;

    // Validate inputs
    if (!file_id || !table_name) {
      return reply.status(400).send({ error: 'file_id and table_name are required' });
    }

    if (!validateTableName(table_name)) {
      return reply
        .status(400)
        .send({ error: 'Invalid table name. Use alphanumeric and underscore only.' });
    }

    try {
      // Get file path from metadata
      const fileResult = await dbConnection.query<{ path: string }>(
        'SELECT path FROM _files WHERE id = ?',
        file_id
      );

      if (fileResult.length === 0) {
        return reply.status(404).send({ error: 'File not found' });
      }

      const filePath = fileResult[0]!.path;

      // Create table using read_csv_auto
      await dbConnection.run(
        `CREATE TABLE IF NOT EXISTS "${table_name}" AS SELECT * FROM read_csv_auto(?)`,
        filePath
      );

      // Store table metadata
      const tableId = generateFileId();
      await dbConnection.run(
        'INSERT INTO _tables (id, name, source_file_id) VALUES (?, ?, ?)',
        tableId,
        table_name,
        file_id
      );

      return { table_id: tableId, table_name };
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .send({ error: `Failed to create table: ${(error as Error).message}` });
    }
  });

  // GET /tables - List all tables
  fastify.get<{ Reply: { tables: TableMetadata[] } }>('/tables', async (_request, reply) => {
    try {
      const tables = await dbConnection.query<TableMetadata>(`
        SELECT t.id, t.name, t.source_file_id, t.created_at
        FROM _tables t
        ORDER BY t.created_at DESC
      `);
      return { tables };
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .send({ error: 'Failed to retrieve tables' } as unknown as { tables: TableMetadata[] });
    }
  });

  // GET /tables/:tableName/preview - Preview table data
  fastify.get<{ Params: { tableName: string }; Querystring: { limit?: string } }>(
    '/tables/:tableName/preview',
    async (request, reply) => {
      const { tableName } = request.params;
      const limit = Math.min(parseInt(request.query.limit || '100'), 1000);

      // Validate table name to prevent SQL injection
      if (!validateTableName(tableName)) {
        return reply.status(400).send({ error: 'Invalid table name' });
      }

      try {
        // Query table data
        const rows = await dbConnection.query<Record<string, unknown>>(
          `
          SELECT * FROM "${tableName}" LIMIT ?
        `,
          limit
        );

        if (rows.length === 0) {
          return { columns: [], rows: [], row_count: 0 };
        }

        // Extract column information from first row
        const firstRow = rows[0]!;
        const columns = Object.keys(firstRow).map((name) => ({
          name,
          type: 'string', // DuckDB types are complex, default to string for now
        }));

        // Convert rows to 2D array format
        const rowsArray = rows.map((row) => Object.values(row));

        // Get total row count
        const countResult = await dbConnection.query<{ count: bigint | number }>(`
          SELECT COUNT(*) as count FROM "${tableName}"
        `);
        const rowCount = Number(countResult[0]?.count || 0);

        return { columns, rows: rowsArray, row_count: rowCount };
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(500)
          .send({ error: `Failed to preview table: ${(error as Error).message}` });
      }
    }
  );
}
