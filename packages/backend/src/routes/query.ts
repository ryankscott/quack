import { FastifyInstance } from 'fastify';
import dbConnection from '../db/connection.js';
import { formatQueryResult } from '../utils/query.js';

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 10000;
const DEFAULT_TIMEOUT_MS = 30_000;

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
  fastify.post<{ Body: { sql?: string; limit?: number } }>(
    '/query/execute',
    async (request, reply) => {
      const { sql, limit } = request.body || {};

      if (!sql || typeof sql !== 'string' || !sql.trim()) {
        return reply.status(400).send({ error: 'SQL is required' });
      }

      const sanitizedSql = sanitizeSql(sql);
      const requestedLimit = Number(limit ?? DEFAULT_LIMIT);
      const limitValue = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
        : DEFAULT_LIMIT;

      const timeoutMs = Number(process.env.QUERY_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
      const effectiveTimeout = Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS;

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
        return { result };
      } catch (error) {
        fastify.log.error(error);

        if (error instanceof QueryTimeoutError) {
          return reply.status(408).send({ error: error.message });
        }

        const message = (error as Error)?.message ?? 'Unknown error';
        const isSyntaxError = /syntax error|parser error/i.test(message);

        if (isSyntaxError) {
          return reply.status(400).send({ error: message });
        }

        return reply.status(500).send({ error: 'Failed to execute query' });
      }
    }
  );
}
