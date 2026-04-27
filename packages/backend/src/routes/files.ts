import { FastifyInstance } from 'fastify';
import { createWriteStream, mkdir } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import dbConnection from '../db/connection.js';
import { FILE_CONFIG } from '../config.js';
import { generateFileId } from '../utils/csv.js';
import { getCsvColumns, getCsvPreviewRows } from '../services/csvIngestionService.js';

interface FileMetadata {
  id: string;
  filename: string;
  path: string;
  uploaded_at: string;
}

export async function filesRoutes(fastify: FastifyInstance): Promise<void> {
  // Ensure upload directory exists
  mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true }, (err) => {
    if (err) fastify.log.error(`Failed to create upload directory: ${err}`);
  });

  // POST /files/upload
  fastify.post<{ Body: { file?: { filename: string } } }>(
    '/files/upload',
    async (request, reply) => {
      const file = await request.file();

      if (!file) {
        return reply.status(400).type('application/json').send({ error: 'No file provided' });
      }

      const fileId = generateFileId();
      const uploadPath = join(FILE_CONFIG.UPLOAD_DIR, `${fileId}_${file.filename}`);

      try {
        // Save file to disk
        const writeStream = createWriteStream(uploadPath);
        await pipeline(file.file, writeStream);

        // Store metadata in database
        await dbConnection.run(
          'INSERT INTO _files (id, filename, path) VALUES (?, ?, ?)',
          fileId,
          file.filename,
          uploadPath
        );

        return reply.type('application/json').send({ file_id: fileId });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).type('application/json').send({ error: 'Failed to upload file' });
      }
    }
  );

  // GET /files
  fastify.get<{ Reply: { files: FileMetadata[] } }>('/files', async (_request, reply) => {
    try {
      const files = await dbConnection.query<FileMetadata>(
        'SELECT * FROM _files ORDER BY uploaded_at DESC'
      );
      return reply.type('application/json').send({ files });
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .type('application/json')
        .send({ error: 'Failed to retrieve files' } as unknown as { files: FileMetadata[] });
    }
  });

  // GET /files/:fileId/schema
  fastify.get<{ Params: { fileId: string } }>('/files/:fileId/schema', async (request, reply) => {
    const { fileId } = request.params;

    try {
      const fileRows = await dbConnection.query<{ path: string }>(
        'SELECT path FROM _files WHERE id = ?',
        fileId
      );

      if (fileRows.length === 0) {
        return reply.status(404).type('application/json').send({ error: 'File not found' });
      }

      const filePath = fileRows[0]!.path;
      const [columns, previewRows] = await Promise.all([
        getCsvColumns(filePath),
        getCsvPreviewRows(filePath),
      ]);

      return reply.type('application/json').send({
        columns,
        preview_rows: previewRows,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .type('application/json')
        .send({ error: `Failed to inspect file: ${(error as Error).message}` });
    }
  });

  // DELETE /files/:fileId
  fastify.delete<{ Params: { fileId: string } }>('/files/:fileId', async (request, reply) => {
    const { fileId } = request.params;

    try {
      const fileRows = await dbConnection.query<{ path: string }>(
        'SELECT path FROM _files WHERE id = ?',
        fileId
      );

      if (fileRows.length === 0) {
        return reply.status(404).type('application/json').send({ error: 'File not found' });
      }

      const filePath = fileRows[0]!.path;

      await dbConnection.run('UPDATE _tables SET source_file_id = NULL WHERE source_file_id = ?', fileId);
      await dbConnection.run('DELETE FROM _files WHERE id = ?', fileId);

      try {
        await unlink(filePath);
      } catch (error) {
        const unlinkError = error as NodeJS.ErrnoException;
        if (unlinkError.code !== 'ENOENT') {
          fastify.log.warn({ err: unlinkError, fileId, filePath }, 'Failed to delete uploaded file from disk');
        }
      }

      return reply.type('application/json').send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .type('application/json')
        .send({ error: `Failed to delete file: ${(error as Error).message}` });
    }
  });
}
