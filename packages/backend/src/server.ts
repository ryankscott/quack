import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import dbConnection from './db/connection.js';
import { initializeSchema } from './db/schema.js';
import { filesRoutes } from './routes/files.js';
import { tablesRoutes } from './routes/tables.js';
import { queryRoutes } from './routes/query.js';
import { notebooksRoutes } from './routes/notebooks.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Handle BigInt serialization globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Register CORS for local development
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? false : true,
  });

  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 52428800, // 50MB
    },
  });

  // Error handler
  fastify.setErrorHandler((error: unknown, _request, reply) => {
    fastify.log.error(error);
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? (error as { statusCode?: number }).statusCode
        : 500;
    const name =
      typeof error === 'object' && error !== null && 'name' in error
        ? (error as { name?: string }).name
        : 'Error';
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message?: string }).message
        : 'Unknown error';
    reply.status(statusCode || 500).send({
      error: name,
      message: message,
      statusCode: statusCode || 500,
    });
  });

  // Health check endpoint
  fastify.get('/health', async (_request, _reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register route handlers
  await fastify.register(filesRoutes);
  await fastify.register(tablesRoutes);
  await fastify.register(queryRoutes);
  await fastify.register(notebooksRoutes);

  return fastify;
}

async function start() {
  const fastify = await buildServer();

  try {
    // Initialize database connection and schema
    await dbConnection.initialize();
    await initializeSchema();
    fastify.log.info('Database initialized successfully');

    // Start server
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      fastify.log.info(`Received ${signal}, closing server...`);
      try {
        await fastify.close();
        await dbConnection.close();
        fastify.log.info('Server closed successfully');
        process.exit(0);
      } catch (err) {
        fastify.log.error('Error during shutdown:');
        process.exit(1);
      }
    });
  });
}

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { buildServer };
