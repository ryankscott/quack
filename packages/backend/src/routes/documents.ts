import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import {
  createDocument,
  deleteDocument,
  getDocumentWithCells,
  listDocuments,
  updateDocument,
  type CreateDocumentRequest,
  type Document,
  type UpdateDocumentRequest,
} from '../services/documentService.js';
import { exportDocument, type DataMode } from '../services/exportService.js';
import { importDocument } from '../services/importService.js';

interface ExportRequest {
  dataMode: DataMode;
}

export async function documentsRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /documents - Create document
  fastify.post<{ Body: CreateDocumentRequest }>('/documents', async (request, reply) => {
    const { name } = request.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return reply
        .status(400)
        .type('application/json')
        .send({ error: 'Document name is required' });
    }

    try {
      const doc = await createDocument(request.body);
      return reply.type('application/json').send(doc);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).type('application/json').send({ error: 'Failed to create document' });
    }
  });

  // GET /documents - List all documents
  fastify.get<{ Reply: { documents: Document[] } }>('/documents', async (_request, reply) => {
    try {
      const documents = await listDocuments();
      return reply.type('application/json').send({ documents });
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .type('application/json')
        .send({ error: 'Failed to retrieve documents' } as unknown as { documents: Document[] });
    }
  });

  // GET /documents/:id - Get document with cells
  fastify.get<{ Params: { id: string } }>('/documents/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const doc = await getDocumentWithCells(id);

      if (!doc) {
        return reply.status(404).type('application/json').send({ error: 'Document not found' });
      }

      return reply.type('application/json').send(doc);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).type('application/json').send({ error: 'Failed to retrieve document' });
    }
  });

  // PUT /documents/:id - Update document
  fastify.put<{ Params: { id: string }; Body: UpdateDocumentRequest }>(
    '/documents/:id',
    async (request, reply) => {
      const { id } = request.params;

      try {
        const doc = await updateDocument(id, request.body);

        if (!doc) {
          return reply.status(404).type('application/json').send({ error: 'Document not found' });
        }

        return reply.type('application/json').send(doc);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).type('application/json').send({ error: 'Failed to update document' });
      }
    }
  );

  // DELETE /documents/:id - Delete document
  fastify.delete<{ Params: { id: string } }>('/documents/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const success = await deleteDocument(id);

      if (!success) {
        return reply.status(404).type('application/json').send({ error: 'Document not found' });
      }

      return reply.type('application/json').send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).type('application/json').send({ error: 'Failed to delete document' });
    }
  });

  // POST /documents/:id/export - Export document with data
  fastify.post<{ Params: { id: string }; Body: ExportRequest }>(
    '/documents/:id/export',
    async (request, reply) => {
      const { id } = request.params;
      const { dataMode } = request.body;

      if (!['none', 'query-results', 'referenced-tables', 'full-db'].includes(dataMode)) {
        return reply.status(400).type('application/json').send({
          error:
            'Invalid dataMode. Must be one of: none, query-results, referenced-tables, full-db',
        });
      }

      try {
        const result = await exportDocument(id, dataMode);

        if (!result) {
          return reply.status(404).type('application/json').send({ error: 'Document not found' });
        }

        const fileContent = await fs.readFile(result.path);
        return reply
          .type('application/octet-stream')
          .header('Content-Disposition', `attachment; filename="${result.doc.name}.quackdb"`)
          .send(fileContent);
      } catch (error) {
        fastify.log.error(error);
        const message = (error as Error)?.message ?? 'Unknown error';
        return reply
          .status(500)
          .type('application/json')
          .send({ error: `Export failed: ${message}` });
      }
    }
  );

  // POST /documents/import - Import document from .quackdb file
  fastify.post<{ Body: any }>('/documents/import', async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).type('application/json').send({ error: 'No file provided' });
      }

      if (!data.filename.endsWith('.quackdb')) {
        return reply
          .status(400)
          .type('application/json')
          .send({ error: 'File must be a .quackdb file' });
      }

      const buffer = await data.toBuffer();
      const doc = await importDocument(buffer);

      if (!doc) {
        return reply
          .status(400)
          .type('application/json')
          .send({ error: 'No document found in import file' });
      }

      return reply.type('application/json').send(doc);
    } catch (error) {
      fastify.log.error(error);
      const message = (error as Error)?.message ?? 'Unknown error';
      return reply.status(500).type('application/json').send({ error: `Import failed: ${message}` });
    }
  });
}
