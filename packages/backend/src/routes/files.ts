import { FastifyInstance } from 'fastify';
import { createWriteStream, mkdir } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dbConnection from '../db/connection.js';
import { generateFileId } from '../utils/csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOAD_DIR = join(__dirname, '../../..', 'data', 'uploads');

interface FileMetadata {
  id: string;
  filename: string;
  path: string;
  uploaded_at: string;
}

export async function filesRoutes(fastify: FastifyInstance): Promise<void> {
  // Ensure upload directory exists
  mkdir(UPLOAD_DIR, { recursive: true }, (err) => {
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
      const uploadPath = join(UPLOAD_DIR, `${fileId}_${file.filename}`);

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
}
