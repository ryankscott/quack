import dbConnection from '../db/connection.js';
import { generateFileId } from '../utils/csv.js';

export interface Document {
  id: string;
  name: string;
  markdown: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentCell {
  id: string;
  document_id: string;
  cell_index: number;
  cell_type: string;
  sql_text: string | null;
  markdown_text: string | null;
  chart_config: string | null;
  created_at: string;
}

export interface DocumentWithCells extends Document {
  cells: DocumentCell[];
}

export interface CreateDocumentRequest {
  name: string;
  markdown?: string;
  cells?: Array<{
    cell_type: string;
    sql_text?: string;
    markdown_text?: string;
    chart_config?: string;
  }>;
}

export interface UpdateDocumentRequest {
  name?: string;
  markdown?: string;
  cells?: Array<{
    cell_type: string;
    sql_text?: string;
    markdown_text?: string;
    chart_config?: string;
  }>;
}

/**
 * Get a document with all its cells
 */
export async function getDocumentWithCells(docId: string): Promise<DocumentWithCells | null> {
  const docs = await dbConnection.query<Document>('SELECT * FROM _documents WHERE id = ?', docId);
  if (docs.length === 0) {
    return null;
  }
  const doc = docs[0];
  if (!doc) {
    return null;
  }

  const cells = await dbConnection.query<DocumentCell>(
    'SELECT * FROM _document_cells WHERE document_id = ? ORDER BY cell_index ASC',
    docId
  );

  return {
    ...doc,
    cells,
  };
}

/**
 * Create a new document with optional cells
 */
export async function createDocument(
  request: CreateDocumentRequest
): Promise<DocumentWithCells | null> {
  const { name, markdown, cells } = request;

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

  return getDocumentWithCells(docId);
}

/**
 * List all documents
 */
export async function listDocuments(): Promise<Document[]> {
  return dbConnection.query<Document>('SELECT * FROM _documents ORDER BY updated_at DESC');
}

/**
 * Update a document and optionally replace its cells
 */
export async function updateDocument(
  docId: string,
  request: UpdateDocumentRequest
): Promise<DocumentWithCells | null> {
  const { name, markdown, cells } = request;

  // Check if document exists
  const existing = await dbConnection.query<Document>(
    'SELECT * FROM _documents WHERE id = ?',
    docId
  );

  if (existing.length === 0) {
    return null;
  }

  // Update document
  if (name || markdown !== undefined) {
    const nameToUse = name || existing[0]?.name || '';
    const markdownToUse = markdown !== undefined ? markdown : existing[0]?.markdown;
    await dbConnection.run(
      'UPDATE _documents SET name = ?, markdown = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      nameToUse,
      markdownToUse,
      docId
    );
  }

  // Replace cells if provided
  if (cells && Array.isArray(cells)) {
    await dbConnection.run('DELETE FROM _document_cells WHERE document_id = ?', docId);

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

  return getDocumentWithCells(docId);
}

/**
 * Delete a document and all its cells
 */
export async function deleteDocument(docId: string): Promise<boolean> {
  // Check if document exists
  const existing = await dbConnection.query<Document>(
    'SELECT * FROM _documents WHERE id = ?',
    docId
  );

  if (existing.length === 0) {
    return false;
  }

  // Delete cells first (FK constraint)
  await dbConnection.run('DELETE FROM _document_cells WHERE document_id = ?', docId);

  // Delete document
  await dbConnection.run('DELETE FROM _documents WHERE id = ?', docId);

  return true;
}
