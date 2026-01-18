import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import dbConnection from '../db/connection.js';
import { generateFileId } from '../utils/csv.js';
import { extractTableNamesFromSQL } from '../utils/query.js';

interface Document {
  id: string;
  name: string;
  markdown: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentCell {
  id: string;
  document_id: string;
  cell_index: number;
  cell_type: string;
  sql_text: string | null;
  markdown_text: string | null;
  chart_config: string | null;
  created_at: string;
}

interface DocumentWithCells extends Document {
  cells: DocumentCell[];
}

interface CreateDocumentRequest {
  name: string;
  markdown?: string;
  cells?: Array<{
    cell_type: string;
    sql_text?: string;
    markdown_text?: string;
    chart_config?: string;
  }>;
}

interface UpdateDocumentRequest {
  name?: string;
  markdown?: string;
  cells?: Array<{
    cell_type: string;
    sql_text?: string;
    markdown_text?: string;
    chart_config?: string;
  }>;
}

interface ExportRequest {
  dataMode: 'none' | 'query-results' | 'referenced-tables' | 'full-db';
}

const EXPORT_DIR = path.resolve('./data/exports');

async function ensureExportDir(): Promise<void> {
  try {
    await fs.mkdir(EXPORT_DIR, { recursive: true });
  } catch (error) {
    // Directory may already exist
  }
}

async function getDocumentWithCells(documentId: string): Promise<DocumentWithCells | null> {
  const docs = await dbConnection.query<Document>(
    'SELECT * FROM _documents WHERE id = ?',
    documentId
  );

  if (docs.length === 0) return null;

  const doc = docs[0];
  if (!doc) return null;

  const cells = await dbConnection.query<DocumentCell>(
    'SELECT * FROM _document_cells WHERE document_id = ? ORDER BY cell_index ASC',
    documentId
  );

  return {
    id: doc.id,
    name: doc.name,
    markdown: doc.markdown,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    cells,
  };
}

export async function documentsRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /documents - Create document
  fastify.post<{ Body: CreateDocumentRequest }>('/documents', async (request, reply) => {
    const { name, markdown, cells } = request.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return reply.status(400).send({ error: 'Document name is required' });
    }

    try {
      const docId = generateFileId();
      await dbConnection.run(
        'INSERT INTO _documents (id, name, markdown) VALUES (?, ?, ?)',
        docId,
        name.trim(),
        markdown || null
      );

      // Insert cells if provided
      if (cells && Array.isArray(cells)) {
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          if (!cell) continue;
          const cellId = generateFileId();
          await dbConnection.run(
            `INSERT INTO _document_cells 
               (id, document_id, cell_index, cell_type, sql_text, markdown_text, chart_config)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
            cellId,
            docId,
            i,
            cell.cell_type,
            cell.sql_text || null,
            cell.markdown_text || null,
            cell.chart_config || null
          );
        }
      }

      const doc = await getDocumentWithCells(docId);
      return doc;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create document' });
    }
  });

  // GET /documents - List all documents
  fastify.get<{ Reply: { documents: Document[] } }>('/documents', async (_request, reply) => {
    try {
      const documents = await dbConnection.query<Document>(
        'SELECT * FROM _documents ORDER BY updated_at DESC'
      );
      return { documents };
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .send({ error: 'Failed to retrieve documents' } as unknown as { documents: Document[] });
    }
  });

  // GET /documents/:id - Get document with cells
  fastify.get<{ Params: { id: string } }>('/documents/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const doc = await getDocumentWithCells(id);

      if (!doc) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      return doc;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to retrieve document' });
    }
  });

  // PUT /documents/:id - Update document
  fastify.put<{ Params: { id: string }; Body: UpdateDocumentRequest }>(
    '/documents/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { name, markdown, cells } = request.body;

      try {
        // Check if document exists
        const existing = await dbConnection.query<Document>(
          'SELECT * FROM _documents WHERE id = ?',
          id
        );

        if (existing.length === 0) {
          return reply.status(404).send({ error: 'Document not found' });
        }

        // Update document
        if (name || markdown !== undefined) {
          const nameToUse = name || existing[0]?.name || '';
          const markdownToUse = markdown !== undefined ? markdown : existing[0]?.markdown;
          await dbConnection.run(
            'UPDATE _documents SET name = ?, markdown = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            nameToUse,
            markdownToUse,
            id
          );
        }

        // Replace cells if provided
        if (cells && Array.isArray(cells)) {
          await dbConnection.run('DELETE FROM _document_cells WHERE document_id = ?', id);

          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (!cell) continue;
            const cellId = generateFileId();
            await dbConnection.run(
              `INSERT INTO _document_cells 
               (id, document_id, cell_index, cell_type, sql_text, markdown_text, chart_config)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              cellId,
              id,
              i,
              cell.cell_type,
              cell.sql_text || null,
              cell.markdown_text || null,
              cell.chart_config || null
            );
          }
        }

        const doc = await getDocumentWithCells(id);
        return doc;
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to update document' });
      }
    }
  );

  // DELETE /documents/:id - Delete document
  fastify.delete<{ Params: { id: string } }>('/documents/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      // Check if document exists
      const existing = await dbConnection.query<Document>(
        'SELECT * FROM _documents WHERE id = ?',
        id
      );

      if (existing.length === 0) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      // Delete cells first (FK constraint)
      await dbConnection.run('DELETE FROM _document_cells WHERE document_id = ?', id);

      // Delete document
      await dbConnection.run('DELETE FROM _documents WHERE id = ?', id);

      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete document' });
    }
  });

  // POST /documents/:id/export - Export document with data
  fastify.post<{ Params: { id: string }; Body: ExportRequest }>(
    '/documents/:id/export',
    async (request, reply) => {
      const { id } = request.params;
      const { dataMode } = request.body;

      if (!['none', 'query-results', 'referenced-tables', 'full-db'].includes(dataMode)) {
        return reply.status(400).send({
          error:
            'Invalid dataMode. Must be one of: none, query-results, referenced-tables, full-db',
        });
      }

      try {
        // Get document
        const doc = await getDocumentWithCells(id);
        if (!doc) {
          return reply.status(404).send({ error: 'Document not found' });
        }

        // Create export database file
        await ensureExportDir();
        const exportId = generateFileId();
        const exportPath = path.join(EXPORT_DIR, `${exportId}.quackdb`);

        try {
          // ATTACH the export database
          await dbConnection.run(`ATTACH '${exportPath}' AS export;`);

          // Create tables in export database
          await dbConnection.run(
            `
            CREATE TABLE export._documents AS 
            SELECT * FROM _documents WHERE id = ?;
          `,
            id
          );

          await dbConnection.run(
            `
            CREATE TABLE export._document_cells AS 
            SELECT * FROM _document_cells WHERE document_id = ?;
          `,
            id
          );

          // Copy data based on dataMode
          if (dataMode === 'query-results' || dataMode === 'referenced-tables') {
            // Copy metadata about files and tables
            await dbConnection.run(`
              CREATE TABLE export._files AS 
              SELECT * FROM _files;
            `);

            await dbConnection.run(`
              CREATE TABLE export._tables AS 
              SELECT * FROM _tables;
            `);

            // For each cell, extract table names and copy referenced tables
            const tableNamesToExport = new Set<string>();

            for (const cell of doc.cells) {
              if (cell.cell_type === 'sql' && cell.sql_text) {
                const tables = extractTableNamesFromSQL(cell.sql_text);
                tables.forEach((t) => tableNamesToExport.add(t));
              }
            }

            // Copy referenced tables (exclude metadata tables)
            for (const tableName of tableNamesToExport) {
              if (!tableName.startsWith('_')) {
                try {
                  await dbConnection.run(`
                    CREATE TABLE export."${tableName}" AS 
                    SELECT * FROM "${tableName}";
                  `);
                } catch (err) {
                  // Table may not exist, skip
                  fastify.log.warn(`Could not export table ${tableName}:`);
                }
              }
            }
          } else if (dataMode === 'full-db') {
            // Copy everything
            await dbConnection.run(`
              CREATE TABLE export._files AS SELECT * FROM _files;
            `);

            await dbConnection.run(`
              CREATE TABLE export._tables AS SELECT * FROM _tables;
            `);

            await dbConnection.run(`
              CREATE TABLE export._queries AS SELECT * FROM _queries;
            `);

            await dbConnection.run(`
              CREATE TABLE export._query_tables AS SELECT * FROM _query_tables;
            `);

            // Copy all user tables using SHOW TABLES
            const tableNames: { name: string }[] = [];
            try {
              const tableResults = await dbConnection.query<{ name: string }>(
                `SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'main'`
              );
              tableNames.push(...tableResults);
            } catch (_err) {
              // Fallback: use SHOW TABLES
              const showResults = await dbConnection.query(`SHOW TABLES;`);
              for (const row of showResults) {
                const tableName = (Object.values(row as Record<string, unknown>)[0] ||
                  '') as string;
                if (tableName && !tableName.startsWith('_')) {
                  tableNames.push({ name: tableName });
                }
              }
            }

            for (const table of tableNames) {
              try {
                await dbConnection.run(`
                  CREATE TABLE export."${table.name}" AS 
                  SELECT * FROM "${table.name}";
                `);
              } catch (err) {
                fastify.log.warn(`Could not export table ${table.name}:`);
              }
            }
          }

          // DETACH export database
          await dbConnection.run(`DETACH export;`);

          // Stream the file to client
          const fileContent = await fs.readFile(exportPath);
          return reply
            .type('application/octet-stream')
            .header('Content-Disposition', `attachment; filename="${doc.name}.quackdb"`)
            .send(fileContent);
        } catch (error) {
          // Clean up export file if something went wrong
          try {
            await fs.unlink(exportPath);
          } catch (unlinkErr) {
            // Ignore
          }
          throw error;
        }
      } catch (error) {
        fastify.log.error(error);
        const message = (error as Error)?.message ?? 'Unknown error';
        return reply.status(500).send({ error: `Export failed: ${message}` });
      }
    }
  );

  // POST /documents/import - Import document from .quackdb file
  fastify.post<{ Body: any }>('/documents/import', async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      if (!data.filename.endsWith('.quackdb')) {
        return reply.status(400).send({ error: 'File must be a .quackdb file' });
      }

      // Save uploaded file temporarily
      await ensureExportDir();
      const tempPath = path.join(EXPORT_DIR, `temp_${generateFileId()}.quackdb`);
      const buffer = await data.toBuffer();
      await fs.writeFile(tempPath, buffer);

      try {
        // ATTACH the import database
        await dbConnection.run(`ATTACH '${tempPath}' AS import;`);

        // Get document from import database
        const importedDocs = await dbConnection.query<Document>('SELECT * FROM import._documents;');

        if (importedDocs.length === 0) {
          await dbConnection.run(`DETACH import;`);
          return reply.status(400).send({ error: 'No document found in import file' });
        }

        const importedDoc = importedDocs[0];
        if (!importedDoc) {
          await dbConnection.run(`DETACH import;`);
          return reply.status(400).send({ error: 'Invalid document in import file' });
        }
        const newDocId = generateFileId();

        // Insert document with new ID
        await dbConnection.run(
          'INSERT INTO _documents (id, name, markdown) VALUES (?, ?, ?)',
          newDocId,
          importedDoc.name,
          importedDoc.markdown
        );

        // Insert cells
        const importedCells = await dbConnection.query<DocumentCell>(
          'SELECT * FROM import._document_cells ORDER BY cell_index ASC;'
        );

        for (const cell of importedCells) {
          const cellId = generateFileId();
          await dbConnection.run(
            `INSERT INTO _document_cells 
               (id, document_id, cell_index, cell_type, sql_text, markdown_text, chart_config)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
            cellId,
            newDocId,
            cell.cell_index,
            cell.cell_type,
            cell.sql_text,
            cell.markdown_text,
            cell.chart_config
          );
        }

        // Import tables (excluding metadata tables)
        const importedTableList: { name: string }[] = [];
        try {
          const tableResults = await dbConnection.query<{ name: string }>(
            `SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'main'`
          );
          importedTableList.push(...tableResults);
        } catch (_err) {
          // Fallback: use SHOW TABLES on import db
          const showResults = await dbConnection.query(
            `SELECT * FROM import.information_schema.tables;`
          );
          for (const row of showResults) {
            const tableName = (Object.values(row as Record<string, unknown>)[0] || '') as string;
            if (tableName && !tableName.startsWith('_')) {
              importedTableList.push({ name: tableName });
            }
          }
        }

        for (const table of importedTableList) {
          try {
            // Check if table already exists
            const existing = await dbConnection.query(
              `SELECT 1 FROM information_schema.tables 
                 WHERE table_name = ?;`,
              table.name
            );

            if (existing.length === 0) {
              // Table doesn't exist, create it
              await dbConnection.run(`
                  CREATE TABLE "${table.name}" AS 
                  SELECT * FROM import."${table.name}";
                `);
            }
          } catch (err) {
            fastify.log.warn(`Could not import table ${table.name}:`);
          }
        }

        // DETACH import database
        await dbConnection.run(`DETACH import;`);

        // Return the imported document
        const doc = await getDocumentWithCells(newDocId);
        return doc;
      } finally {
        // Clean up temporary file
        try {
          await fs.unlink(tempPath);
        } catch (err) {
          // Ignore
        }
      }
    } catch (error) {
      fastify.log.error(error);
      const message = (error as Error)?.message ?? 'Unknown error';
      return reply.status(500).send({ error: `Import failed: ${message}` });
    }
  });
}
