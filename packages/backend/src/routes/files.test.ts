import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../server.js';
import { FastifyInstance } from 'fastify';
import dbConnection from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';

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
});
