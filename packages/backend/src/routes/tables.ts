import { FastifyInstance } from 'fastify';
import dbConnection from '../db/connection.js';
import {
  CsvColumn,
  CsvImportValidationError,
  buildColumnSelectClause,
  getCsvColumns,
  quoteIdentifier,
  resolveColumnMappings,
} from '../services/csvIngestionService.js';
import { generateFileId, validateTableName } from '../utils/csv.js';

interface CreateTableRequest {
  file_id: string;
  table_name: string;
  mode?: 'create' | 'append';
  target_table?: string;
  column_mappings?: Array<{
    source_name: string;
    target_name?: string;
  }>;
}

interface TableMetadata {
  id: string;
  name: string;
  source_file_id: string | null;
  created_at: string;
}

interface TableSchemaRow {
  column_name: string;
  data_type: string;
}

async function getTableColumns(tableName: string): Promise<CsvColumn[]> {
  const schemaResult = await dbConnection.query<TableSchemaRow>(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'main' AND table_name = ?
     ORDER BY ordinal_position`,
    tableName
  );

  return schemaResult.map((row) => ({
    name: row.column_name,
    type: row.data_type,
  }));
}

function assertCsvColumnsExist(csvColumns: CsvColumn[], sourceColumnNames: string[]): void {
  const availableColumnNames = new Set(csvColumns.map((column) => column.name));

  for (const sourceColumnName of sourceColumnNames) {
    if (!availableColumnNames.has(sourceColumnName)) {
      throw new CsvImportValidationError(`CSV column "${sourceColumnName}" was not found in the file`);
    }
  }
}

function assertAppendMappingsMatchTargetTable(
  targetColumns: CsvColumn[],
  targetColumnNames: string[]
): void {
  const existingTargetNames = targetColumns.map((column) => column.name);

  if (existingTargetNames.length !== targetColumnNames.length) {
    throw new CsvImportValidationError(
      `Selected columns must match the target table schema exactly: ${existingTargetNames.join(', ')}`
    );
  }

  const existingTargetNameSet = new Set(existingTargetNames);

  for (const targetColumnName of targetColumnNames) {
    if (!existingTargetNameSet.has(targetColumnName)) {
      throw new CsvImportValidationError(
        `Selected columns must match the target table schema exactly: ${existingTargetNames.join(', ')}`
      );
    }
  }
}

async function removeTableSelectionsFromNotebookCells(tableName: string): Promise<void> {
  const notebookCells = await dbConnection.query<{ id: string; selected_tables: string | null }>(
    'SELECT id, selected_tables FROM _notebook_cells WHERE selected_tables IS NOT NULL'
  );

  for (const cell of notebookCells) {
    if (!cell.selected_tables) {
      continue;
    }

    let selectedTables: string[];
    try {
      const parsed = JSON.parse(cell.selected_tables);
      if (!Array.isArray(parsed)) {
        continue;
      }
      selectedTables = parsed.filter((value): value is string => typeof value === 'string');
    } catch {
      continue;
    }

    const nextSelectedTables = selectedTables.filter((selectedTable) => selectedTable !== tableName);
    if (nextSelectedTables.length === selectedTables.length) {
      continue;
    }

    await dbConnection.run(
      'UPDATE _notebook_cells SET selected_tables = ? WHERE id = ?',
      nextSelectedTables.length > 0 ? JSON.stringify(nextSelectedTables) : null,
      cell.id
    );
  }
}

export async function tablesRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /tables - Create table from file or append to existing table
  fastify.post<{ Body: CreateTableRequest }>('/tables', async (request, reply) => {
    const { file_id, table_name, mode = 'create', target_table, column_mappings } = request.body;

    if (!file_id) {
      return reply.status(400).type('application/json').send({ error: 'file_id is required' });
    }

    if (mode === 'append') {
      if (!target_table) {
        return reply
          .status(400)
          .type('application/json')
          .send({ error: 'target_table is required when mode is append' });
      }

      if (!validateTableName(target_table)) {
        return reply
          .status(400)
          .type('application/json')
          .send({ error: 'Invalid target_table name. Use alphanumeric and underscore only.' });
      }
    } else {
      if (!table_name) {
        return reply
          .status(400)
          .type('application/json')
          .send({ error: 'table_name is required when mode is create' });
      }

      if (!validateTableName(table_name)) {
        return reply
          .status(400)
          .type('application/json')
          .send({ error: 'Invalid table name. Use alphanumeric and underscore only.' });
      }
    }

    let resolvedColumnMappings;
    try {
      resolvedColumnMappings = resolveColumnMappings(column_mappings);
    } catch (error) {
      return reply.status(400).type('application/json').send({ error: (error as Error).message });
    }

    try {
      const fileResult = await dbConnection.query<{ path: string }>(
        'SELECT path FROM _files WHERE id = ?',
        file_id
      );

      if (fileResult.length === 0) {
        return reply.status(404).type('application/json').send({ error: 'File not found' });
      }

      const filePath = fileResult[0]!.path;

      if (mode === 'append') {
        const tableExists = await dbConnection.query<{ count: bigint | number }>(
          `SELECT COUNT(*) as count
           FROM information_schema.tables
           WHERE table_schema = 'main' AND table_name = ?`,
          target_table
        );

        if (Number(tableExists[0]?.count ?? 0) === 0) {
          return reply.status(404).type('application/json').send({ error: 'Target table not found' });
        }

        const escapedTargetTable = quoteIdentifier(target_table!);

        if (resolvedColumnMappings) {
          const csvColumns = await getCsvColumns(filePath);
          assertCsvColumnsExist(
            csvColumns,
            resolvedColumnMappings.map((mapping) => mapping.sourceName)
          );

          const targetColumns = await getTableColumns(target_table!);
          assertAppendMappingsMatchTargetTable(
            targetColumns,
            resolvedColumnMappings.map((mapping) => mapping.targetName)
          );

          const insertColumns = resolvedColumnMappings
            .map((mapping) => quoteIdentifier(mapping.targetName))
            .join(', ');
          const selectClause = buildColumnSelectClause(resolvedColumnMappings);

          await dbConnection.run(
            `INSERT INTO ${escapedTargetTable} (${insertColumns})
             SELECT ${selectClause}
             FROM read_csv_auto(?)`,
            filePath
          );
        } else {
          await dbConnection.run(
            `INSERT INTO ${escapedTargetTable} SELECT * FROM read_csv_auto(?)`,
            filePath
          );
        }

        return reply.type('application/json').send({ table_id: '', table_name: target_table });
      }

      const escapedTableName = quoteIdentifier(table_name);

      if (resolvedColumnMappings) {
        const csvColumns = await getCsvColumns(filePath);
        assertCsvColumnsExist(
          csvColumns,
          resolvedColumnMappings.map((mapping) => mapping.sourceName)
        );

        const selectClause = buildColumnSelectClause(resolvedColumnMappings);
        await dbConnection.run(
          `CREATE TABLE IF NOT EXISTS ${escapedTableName} AS
           SELECT ${selectClause}
           FROM read_csv_auto(?)`,
          filePath
        );
      } else {
        await dbConnection.run(
          `CREATE TABLE IF NOT EXISTS ${escapedTableName} AS SELECT * FROM read_csv_auto(?)`,
          filePath
        );
      }

      const tableId = generateFileId();
      await dbConnection.run(
        'INSERT INTO _tables (id, name, source_file_id) VALUES (?, ?, ?)',
        tableId,
        table_name,
        file_id
      );

      return reply.type('application/json').send({ table_id: tableId, table_name });
    } catch (error) {
      if (error instanceof CsvImportValidationError) {
        return reply.status(400).type('application/json').send({ error: error.message });
      }

      fastify.log.error(error);
      return reply
        .status(500)
        .type('application/json')
        .send({
          error: `Failed to ${mode === 'append' ? 'append to' : 'create'} table: ${(error as Error).message}`,
        });
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
      return reply.type('application/json').send({ tables });
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .type('application/json')
        .send({ error: 'Failed to retrieve tables' } as unknown as { tables: TableMetadata[] });
    }
  });

  // DELETE /tables/:tableName
  fastify.delete<{ Params: { tableName: string } }>('/tables/:tableName', async (request, reply) => {
    const { tableName } = request.params;

    if (!validateTableName(tableName)) {
      return reply.status(400).type('application/json').send({ error: 'Invalid table name' });
    }

    let transactionStarted = false;

    try {
      const tableExists = await dbConnection.query<{ count: bigint | number }>(
        `SELECT COUNT(*) as count
         FROM information_schema.tables
         WHERE table_schema = 'main' AND table_name = ?`,
        tableName
      );

      if (Number(tableExists[0]?.count ?? 0) === 0) {
        return reply.status(404).type('application/json').send({ error: 'Table not found' });
      }

      await dbConnection.run('BEGIN TRANSACTION');
      transactionStarted = true;
      await dbConnection.run(`DROP TABLE ${quoteIdentifier(tableName)}`);
      await dbConnection.run('DELETE FROM _tables WHERE name = ?', tableName);
      await removeTableSelectionsFromNotebookCells(tableName);
      await dbConnection.run('COMMIT');
      transactionStarted = false;

      return reply.type('application/json').send({ success: true });
    } catch (error) {
      if (transactionStarted) {
        await dbConnection.run('ROLLBACK');
      }
      fastify.log.error(error);
      return reply
        .status(500)
        .type('application/json')
        .send({ error: `Failed to delete table: ${(error as Error).message}` });
    }
  });

  // GET /tables/:tableName/schema - Get table schema
  fastify.get<{ Params: { tableName: string } }>(
    '/tables/:tableName/schema',
    async (request, reply) => {
      const { tableName } = request.params;

      if (!validateTableName(tableName)) {
        return reply.status(400).type('application/json').send({ error: 'Invalid table name' });
      }

      try {
        const columns = await getTableColumns(tableName);

        if (columns.length === 0) {
          return reply.status(404).type('application/json').send({ error: 'Table not found' });
        }

        return reply.type('application/json').send({ columns });
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(500)
          .type('application/json')
          .send({ error: `Failed to get table schema: ${(error as Error).message}` });
      }
    }
  );

  // GET /tables/:tableName/preview - Preview table data
  fastify.get<{ Params: { tableName: string }; Querystring: { limit?: string } }>(
    '/tables/:tableName/preview',
    async (request, reply) => {
      const { tableName } = request.params;
      const limit = Math.min(parseInt(request.query.limit || '100'), 1000);

      if (!validateTableName(tableName)) {
        return reply.status(400).type('application/json').send({ error: 'Invalid table name' });
      }

      try {
        const rows = await dbConnection.query<Record<string, unknown>>(
          `SELECT * FROM ${quoteIdentifier(tableName)} LIMIT ?`,
          limit
        );

        if (rows.length === 0) {
          return reply.type('application/json').send({ columns: [], rows: [], row_count: 0 });
        }

        const firstRow = rows[0]!;
        const columns = Object.keys(firstRow).map((name) => ({
          name,
          type: 'string',
        }));
        const rowsArray = rows.map((row) => Object.values(row));

        const countResult = await dbConnection.query<{ count: bigint | number }>(
          `SELECT COUNT(*) as count FROM ${quoteIdentifier(tableName)}`
        );
        const rowCount = Number(countResult[0]?.count || 0);

        return reply.type('application/json').send({
          columns,
          rows: rowsArray,
          row_count: rowCount,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(500)
          .type('application/json')
          .send({ error: `Failed to preview table: ${(error as Error).message}` });
      }
    }
  );
}
