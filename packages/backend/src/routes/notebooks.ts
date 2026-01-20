import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import {
  createNotebook,
  deleteNotebook,
  getNotebookWithCells,
  listNotebooks,
  updateNotebook,
  type CreateNotebookRequest,
  type Notebook,
  type UpdateNotebookRequest,
} from '../services/notebookService.js';
import { exportNotebook, exportNotebookAsMarkdown, type ExportFormat } from '../services/exportService.js';
import { importNotebook } from '../services/importService.js';

interface ExportRequest {
  format: ExportFormat;
  chartImages?: Record<string, string>;
}

export async function notebooksRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /notebooks - Create notebook
  fastify.post<{ Body: CreateNotebookRequest }>('/notebooks', async (request, reply) => {
    const { name } = request.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return reply
        .status(400)
        .type('application/json')
        .send({ error: 'Notebook name is required' });
    }

    try {
      const notebook = await createNotebook(request.body);
      return reply.type('application/json').send(notebook);
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .type('application/json')
        .send({ error: 'Failed to create notebook' });
    }
  });

  // GET /notebooks - List all notebooks
  fastify.get<{ Reply: { notebooks: Notebook[] } }>('/notebooks', async (_request, reply) => {
    try {
      const notebooks = await listNotebooks();
      return reply.type('application/json').send({ notebooks });
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .type('application/json')
        .send({ error: 'Failed to retrieve notebooks' } as unknown as { notebooks: Notebook[] });
    }
  });

  // GET /notebooks/:id - Get notebook with cells
  fastify.get<{ Params: { id: string } }>('/notebooks/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const notebook = await getNotebookWithCells(id);

      if (!notebook) {
        return reply.status(404).type('application/json').send({ error: 'Notebook not found' });
      }

      return reply.type('application/json').send(notebook);
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .type('application/json')
        .send({ error: 'Failed to retrieve notebook' });
    }
  });

  // PUT /notebooks/:id - Update notebook
  fastify.put<{ Params: { id: string }; Body: UpdateNotebookRequest }>(
    '/notebooks/:id',
    async (request, reply) => {
      const { id } = request.params;

      try {
        const notebook = await updateNotebook(id, request.body);

        if (!notebook) {
          return reply.status(404).type('application/json').send({ error: 'Notebook not found' });
        }

        return reply.type('application/json').send(notebook);
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(500)
          .type('application/json')
          .send({ error: 'Failed to update notebook' });
      }
    }
  );

  // DELETE /notebooks/:id - Delete notebook
  fastify.delete<{ Params: { id: string } }>('/notebooks/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const success = await deleteNotebook(id);

      if (!success) {
        return reply.status(404).type('application/json').send({ error: 'Notebook not found' });
      }

      return reply.type('application/json').send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .type('application/json')
        .send({ error: 'Failed to delete notebook' });
    }
  });

  // POST /notebooks/:id/export - Export notebook as markdown or .quackdb
  fastify.post<{ Params: { id: string }; Body: ExportRequest }>(
    '/notebooks/:id/export',
    async (request, reply) => {
      const { id } = request.params;
      const { format, chartImages } = request.body;

      if (!format || !['markdown', 'quackdb'].includes(format)) {
        return reply.status(400).type('application/json').send({
          error: 'Invalid format. Must be one of: markdown, quackdb',
        });
      }

      try {
        if (format === 'markdown') {
          const markdown = await exportNotebookAsMarkdown(id, chartImages);
          const notebook = await getNotebookWithCells(id);
          if (!notebook) {
            return reply.status(404).type('application/json').send({ error: 'Notebook not found' });
          }
          return reply
            .type('text/markdown')
            .header('Content-Disposition', `attachment; filename="${notebook.name}.md"`)
            .send(markdown);
        } else {
          // format === 'quackdb'
          const result = await exportNotebook(id);

          if (!result) {
            return reply.status(404).type('application/json').send({ error: 'Notebook not found' });
          }

          const fileContent = await fs.readFile(result.path);
          return reply
            .type('application/octet-stream')
            .header('Content-Disposition', `attachment; filename="${result.notebook.name}.quackdb"`)
            .send(fileContent);
        }
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

  // POST /notebooks/import - Import notebook from .quackdb file
  fastify.post<{ Body: any }>('/notebooks/import', async (request, reply) => {
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
      const notebook = await importNotebook(buffer);

      if (!notebook) {
        return reply
          .status(400)
          .type('application/json')
          .send({ error: 'No notebook found in import file' });
      }

      return reply.type('application/json').send(notebook);
    } catch (error) {
      fastify.log.error(error);
      const message = (error as Error)?.message ?? 'Unknown error';
      return reply
        .status(500)
        .type('application/json')
        .send({ error: `Import failed: ${message}` });
    }
  });
}
