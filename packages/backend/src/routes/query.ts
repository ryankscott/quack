import { FastifyInstance } from 'fastify';
import dbConnection from '../db/connection.js';
import { formatQueryResult } from '../utils/query.js';
import { QUERY_CONFIG } from '../config.js';
import { validateTableAccess } from '../utils/query-validator.js';
import { generateFileId } from '../utils/csv.js';

class QueryTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueryTimeoutError';
  }
}

function sanitizeSql(sql: string): string {
  return sql.trim().replace(/;+\s*$/, '');
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new QueryTimeoutError(`Query timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function queryRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: { sql?: string; limit?: number; allowed_tables?: string[] } }>(
    '/query/execute',
    async (request, reply) => {
      const { sql, limit, allowed_tables } = request.body || {};

      if (!sql || typeof sql !== 'string' || !sql.trim()) {
        return reply.status(400).type('application/json').send({ error: 'SQL is required' });
      }

      const sanitizedSql = sanitizeSql(sql);

      // Validate table access if allowed_tables is provided
      if (allowed_tables && Array.isArray(allowed_tables)) {
        const validation = validateTableAccess(sanitizedSql, allowed_tables);
        if (!validation.valid) {
          return reply.status(403).type('application/json').send({ error: validation.error });
        }
      }
      const requestedLimit = Number(limit ?? QUERY_CONFIG.DEFAULT_LIMIT);
      const limitValue = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), QUERY_CONFIG.MAX_LIMIT)
        : QUERY_CONFIG.DEFAULT_LIMIT;

      const timeoutMs = Number(process.env.QUERY_TIMEOUT_MS ?? QUERY_CONFIG.DEFAULT_TIMEOUT_MS);
      const effectiveTimeout = Number.isFinite(timeoutMs)
        ? timeoutMs
        : QUERY_CONFIG.DEFAULT_TIMEOUT_MS;

      try {
        const execution = async () => {
          const countSql = `SELECT COUNT(*) as count FROM (${sanitizedSql}) AS subquery`;
          const dataSql = `SELECT * FROM (${sanitizedSql}) AS subquery LIMIT ${limitValue}`;

          const [countResult, rows] = await Promise.all([
            dbConnection.query<{ count: bigint | number }>(countSql),
            dbConnection.query<Record<string, unknown>>(dataSql),
          ]);

          const totalRows = Number(countResult[0]?.count ?? rows.length);
          return formatQueryResult(rows, limitValue, totalRows);
        };

        const result = await withTimeout(execution(), effectiveTimeout);
        return reply.type('application/json').send({ result });
      } catch (error) {
        fastify.log.error(error);

        if (error instanceof QueryTimeoutError) {
          return reply.status(408).type('application/json').send({ error: error.message });
        }

        const message = (error as Error)?.message ?? 'Unknown error';
        const isSyntaxError = /syntax error|parser error/i.test(message);

        if (isSyntaxError) {
          return reply.status(400).type('application/json').send({ error: message });
        }

        return reply
          .status(500)
          .type('application/json')
          .send({ error: 'Failed to execute query' });
      }
    }
  );

  fastify.post<{
    Body: { sql?: string; table_name?: string; description?: string; allowed_tables?: string[] };
  }>('/query/save-to-table', async (request, reply) => {
    const { sql, table_name, description, allowed_tables } = request.body || {};

    if (!sql || typeof sql !== 'string' || !sql.trim()) {
      return reply.status(400).type('application/json').send({ error: 'SQL is required' });
    }

    if (!table_name || typeof table_name !== 'string' || !table_name.trim()) {
      return reply.status(400).type('application/json').send({ error: 'table_name is required' });
    }

    const sanitizedSql = sanitizeSql(sql);
    const sanitizedTableName = table_name.trim();

    // Validate table name (alphanumeric and underscore only)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sanitizedTableName)) {
      return reply
        .status(400)
        .type('application/json')
        .send({ error: 'Invalid table name. Use only letters, numbers, and underscores.' });
    }

    // Validate table access if allowed_tables is provided
    if (allowed_tables && Array.isArray(allowed_tables)) {
      const validation = validateTableAccess(sanitizedSql, allowed_tables);
      if (!validation.valid) {
        return reply.status(403).type('application/json').send({ error: validation.error });
      }
    }

    try {
      // Check if table already exists
      const existingTables = await dbConnection.query<{ name: string }>(
        "SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'main'"
      );

      const tableExists = existingTables.some(
        (t) => t.name.toLowerCase() === sanitizedTableName.toLowerCase()
      );

      if (tableExists) {
        return reply
          .status(400)
          .type('application/json')
          .send({ error: `Table '${sanitizedTableName}' already exists` });
      }

      // Create table from query results
      const createTableSql = `CREATE TABLE "${sanitizedTableName}" AS ${sanitizedSql}`;
      await dbConnection.run(createTableSql);

      // Add table description as comment if provided
      if (description && typeof description === 'string' && description.trim()) {
        const commentSql = `COMMENT ON TABLE "${sanitizedTableName}" IS '${description.trim().replace(/'/g, "''")}'`;
        await dbConnection.run(commentSql);
      }

      // Store table metadata so it appears in the tables list
      const tableId = generateFileId();
      await dbConnection.run(
        'INSERT INTO _tables (id, name, source_file_id) VALUES (?, ?, ?)',
        tableId,
        sanitizedTableName,
        null // No source file for query-generated tables
      );

      // Get row count
      const countResult = await dbConnection.query<{ count: bigint | number }>(
        `SELECT COUNT(*) as count FROM "${sanitizedTableName}"`
      );
      const rowCount = Number(countResult[0]?.count ?? 0);

      return reply
        .type('application/json')
        .send({ table_name: sanitizedTableName, row_count: rowCount });
    } catch (error) {
      fastify.log.error(error);

      const message = (error as Error)?.message ?? 'Unknown error';
      const isSyntaxError = /syntax error|parser error/i.test(message);

      if (isSyntaxError) {
        return reply.status(400).type('application/json').send({ error: message });
      }

      return reply
        .status(500)
        .type('application/json')
        .send({ error: 'Failed to create table from query' });
    }
  });
}
