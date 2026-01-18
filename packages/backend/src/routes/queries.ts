import { FastifyInstance } from 'fastify';
import dbConnection from '../db/connection.js';
import { generateFileId } from '../utils/csv.js';
import { extractTableNamesFromSQL } from '../utils/query.js';

interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  referencedTables: string[];
  warnings?: string[];
  created_at: string;
  updated_at: string;
}

interface TableMetadata {
  id: string;
  name: string;
  source_file_id: string | null;
  created_at: string;
}

interface CreateQueryRequest {
  name: string;
  sql: string;
}

interface UpdateQueryRequest {
  name?: string;
  sql?: string;
}

/**
 * Get all existing table names in the database
 */
async function getExistingTables(): Promise<Set<string>> {
  const tables = await dbConnection.query<TableMetadata>('SELECT name FROM _tables');
  return new Set(tables.map((t) => t.name.toLowerCase()));
}

/**
 * Get table references for a query
 */
async function getQueryTableReferences(queryId: string): Promise<string[]> {
  const refs = await dbConnection.query<{ table_name: string }>(
    'SELECT table_name FROM _query_tables WHERE query_id = ? ORDER BY table_name',
    queryId
  );
  return refs.map((r) => r.table_name);
}

/**
 * Store table references for a query
 */
async function storeTableReferences(queryId: string, tableNames: Set<string>): Promise<void> {
  // Delete existing references
  await dbConnection.run('DELETE FROM _query_tables WHERE query_id = ?', queryId);

  // Insert new references
  for (const tableName of tableNames) {
    await dbConnection.run(
      'INSERT INTO _query_tables (query_id, table_name) VALUES (?, ?)',
      queryId,
      tableName
    );
  }
}

/**
 * Validate table references and generate warnings
 */
async function validateTableReferences(tableNames: Set<string>): Promise<string[]> {
  const existingTables = await getExistingTables();
  const warnings: string[] = [];

  for (const tableName of tableNames) {
    if (!existingTables.has(tableName)) {
      warnings.push(`Table '${tableName}' does not exist`);
    }
  }

  return warnings;
}

/**
 * Build a complete SavedQuery object with references and warnings
 */
async function buildQueryResponse(queryId: string): Promise<SavedQuery> {
  const queries = await dbConnection.query<Omit<SavedQuery, 'referencedTables' | 'warnings'>>(
    'SELECT * FROM _queries WHERE id = ?',
    queryId
  );

  const query = queries[0];
  if (!query) {
    throw new Error('Query not found');
  }

  const referencedTables = await getQueryTableReferences(queryId);
  const warnings = await validateTableReferences(new Set(referencedTables));

  return {
    ...query,
    referencedTables,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export async function queriesRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /queries - Create saved query
  fastify.post<{ Body: CreateQueryRequest }>('/queries', async (request, reply) => {
    const { name, sql } = request.body;

    if (!name || !sql) {
      return reply.status(400).send({ error: 'name and sql are required' });
    }

    try {
      const queryId = generateFileId();

      // Extract table names from SQL
      const tableNames = extractTableNamesFromSQL(sql);

      // Insert query
      await dbConnection.run(
        'INSERT INTO _queries (id, name, sql) VALUES (?, ?, ?)',
        queryId,
        name.trim(),
        sql.trim()
      );

      // Store table references
      await storeTableReferences(queryId, tableNames);

      // Return query with references and warnings
      return await buildQueryResponse(queryId);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create query' });
    }
  });

  // GET /queries - List all saved queries
  fastify.get<{ Reply: { queries: SavedQuery[] } }>('/queries', async (_request, reply) => {
    try {
      const queryRows = await dbConnection.query<Omit<SavedQuery, 'referencedTables' | 'warnings'>>(
        'SELECT * FROM _queries ORDER BY updated_at DESC'
      );

      // Build full query objects with references
      const queries = await Promise.all(queryRows.map((q) => buildQueryResponse(q.id)));

      return { queries };
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .send({ error: 'Failed to retrieve queries' } as unknown as { queries: SavedQuery[] });
    }
  });

  // GET /queries/:id - Get single query
  fastify.get<{ Params: { id: string } }>('/queries/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const queries = await dbConnection.query<SavedQuery>(
        'SELECT * FROM _queries WHERE id = ?',
        id
      );

      if (queries.length === 0) {
        return reply.status(404).send({ error: 'Query not found' });
      }

      return await buildQueryResponse(id);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to retrieve query' });
    }
  });

  // PUT /queries/:id - Update query
  fastify.put<{ Params: { id: string }; Body: UpdateQueryRequest }>(
    '/queries/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { name, sql } = request.body;

      if (!name && !sql) {
        return reply.status(400).send({ error: 'name or sql is required' });
      }

      try {
        // Check if query exists
        const existing = await dbConnection.query<SavedQuery>(
          'SELECT * FROM _queries WHERE id = ?',
          id
        );

        if (existing.length === 0) {
          return reply.status(404).send({ error: 'Query not found' });
        }

        // Build update query
        const updates: string[] = [];
        const params: unknown[] = [];

        if (name !== undefined) {
          updates.push('name = ?');
          params.push(name.trim());
        }

        if (sql !== undefined) {
          updates.push('sql = ?');
          params.push(sql.trim());

          // Extract and store new table references
          const tableNames = extractTableNamesFromSQL(sql);
          await storeTableReferences(id, tableNames);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        await dbConnection.run(`UPDATE _queries SET ${updates.join(', ')} WHERE id = ?`, ...params);

        return await buildQueryResponse(id);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to update query' });
      }
    }
  );

  // DELETE /queries/:id - Delete query
  fastify.delete<{ Params: { id: string } }>('/queries/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const existing = await dbConnection.query<SavedQuery>(
        'SELECT * FROM _queries WHERE id = ?',
        id
      );

      if (existing.length === 0) {
        return reply.status(404).send({ error: 'Query not found' });
      }

      await dbConnection.run('DELETE FROM _queries WHERE id = ?', id);

      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete query' });
    }
  });
}
