import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import dbConnection from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';

describe('Queries Routes', () => {
  let server: FastifyInstance;
  let queryId: string;

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

  it('creates a saved query', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/queries',
      payload: {
        name: 'Test Query',
        sql: 'SELECT 1 as value',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('id');
    expect(body.name).toBe('Test Query');
    expect(body.sql).toBe('SELECT 1 as value');
    queryId = body.id;
  });

  it('lists saved queries', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/queries',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('queries');
    expect(Array.isArray(body.queries)).toBe(true);
    expect(body.queries.length).toBeGreaterThan(0);
  });

  it('gets a single query', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/queries/${queryId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.id).toBe(queryId);
    expect(body.name).toBe('Test Query');
  });

  it('updates a query', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: `/queries/${queryId}`,
      payload: {
        name: 'Updated Query',
        sql: 'SELECT 2 as value',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.name).toBe('Updated Query');
    expect(body.sql).toBe('SELECT 2 as value');
  });

  it('deletes a query', async () => {
    const response = await server.inject({
      method: 'DELETE',
      url: `/queries/${queryId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  it('returns 404 for non-existent query', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/queries/does_not_exist',
    });

    expect(response.statusCode).toBe(404);
  });
});
