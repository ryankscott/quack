import dbConnection from '../db/connection.js';
import { generateFileId } from '../utils/csv.js';

export interface Notebook {
  id: string;
  name: string;
  markdown: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotebookCell {
  id: string;
  notebook_id: string;
  cell_index: number;
  cell_type: string;
  sql_text: string | null;
  markdown_text: string | null;
  chart_config: string | null;
  selected_tables: string | null; // JSON string in DB
  created_at: string;
}

export interface NotebookCellResponse {
  id: string;
  notebook_id: string;
  cell_index: number;
  cell_type: string;
  sql_text: string | null;
  markdown_text: string | null;
  chart_config: string | null;
  selected_tables: string[] | null; // Parsed array in API response
  created_at: string;
}

export interface NotebookWithCells extends Notebook {
  cells: NotebookCellResponse[];
}

export interface CreateNotebookRequest {
  name: string;
  markdown?: string;
  cells?: Array<{
    cell_type: string;
    sql_text?: string;
    markdown_text?: string;
    chart_config?: string;
    selected_tables?: string[];
  }>;
}

export interface UpdateNotebookRequest {
  name?: string;
  markdown?: string;
  cells?: Array<{
    cell_type: string;
    sql_text?: string;
    markdown_text?: string;
    chart_config?: string;
    selected_tables?: string[];
  }>;
}

/**
 * Get a notebook with all its cells
 */
export async function getNotebookWithCells(
  notebookId: string
): Promise<NotebookWithCells | null> {
  const notebooks = await dbConnection.query<Notebook>(
    'SELECT * FROM _notebooks WHERE id = ?',
    notebookId
  );
  if (notebooks.length === 0) {
    return null;
  }
  const notebook = notebooks[0];
  if (!notebook) {
    return null;
  }

  const cells = await dbConnection.query<NotebookCell>(
    'SELECT * FROM _notebook_cells WHERE notebook_id = ? ORDER BY cell_index ASC',
    notebookId
  );

  // Parse selected_tables JSON strings to arrays for API response
  const cellsWithParsedTables: NotebookCellResponse[] = cells.map((cell) => {
    let selectedTables: string[] | null = null;
    if (cell.selected_tables) {
      try {
        selectedTables = JSON.parse(cell.selected_tables);
      } catch {
        selectedTables = null;
      }
    }
    return {
      ...cell,
      selected_tables: selectedTables,
    };
  });

  return {
    ...notebook,
    cells: cellsWithParsedTables,
  };
}

/**
 * Create a new notebook with optional cells
 */
export async function createNotebook(
  request: CreateNotebookRequest
): Promise<NotebookWithCells | null> {
  const { name, markdown, cells } = request;

  const notebookId = generateFileId();
  await dbConnection.run(
    'INSERT INTO _notebooks (id, name, markdown) VALUES (?, ?, ?)',
    notebookId,
    name.trim(),
    markdown || null
  );

  // Insert cells if provided
  if (cells && Array.isArray(cells)) {
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell) continue;
      const cellId = generateFileId();
      const selectedTablesJson = cell.selected_tables && cell.selected_tables.length > 0
        ? JSON.stringify(cell.selected_tables)
        : null;
      await dbConnection.run(
        `INSERT INTO _notebook_cells 
           (id, notebook_id, cell_index, cell_type, sql_text, markdown_text, chart_config, selected_tables)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        cellId,
        notebookId,
        i,
        cell.cell_type,
        cell.sql_text || null,
        cell.markdown_text || null,
        cell.chart_config || null,
        selectedTablesJson
      );
    }
  }

  return getNotebookWithCells(notebookId);
}

/**
 * List all notebooks
 */
export async function listNotebooks(): Promise<Notebook[]> {
  return dbConnection.query<Notebook>('SELECT * FROM _notebooks ORDER BY updated_at DESC');
}

/**
 * Update a notebook and optionally replace its cells
 */
export async function updateNotebook(
  notebookId: string,
  request: UpdateNotebookRequest
): Promise<NotebookWithCells | null> {
  const { name, markdown, cells } = request;

  // Check if notebook exists
  const existing = await dbConnection.query<Notebook>(
    'SELECT * FROM _notebooks WHERE id = ?',
    notebookId
  );

  if (existing.length === 0) {
    return null;
  }

  // Update notebook
  if (name || markdown !== undefined) {
    const nameToUse = name || existing[0]?.name || '';
    const markdownToUse = markdown !== undefined ? markdown : existing[0]?.markdown;
    await dbConnection.run(
      'UPDATE _notebooks SET name = ?, markdown = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      nameToUse,
      markdownToUse,
      notebookId
    );
  }

  // Replace cells if provided
  if (cells && Array.isArray(cells)) {
    await dbConnection.run('DELETE FROM _notebook_cells WHERE notebook_id = ?', notebookId);

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell) continue;
      const cellId = generateFileId();
      const selectedTablesJson = cell.selected_tables && cell.selected_tables.length > 0
        ? JSON.stringify(cell.selected_tables)
        : null;
      await dbConnection.run(
        `INSERT INTO _notebook_cells 
         (id, notebook_id, cell_index, cell_type, sql_text, markdown_text, chart_config, selected_tables)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        cellId,
        notebookId,
        i,
        cell.cell_type,
        cell.sql_text || null,
        cell.markdown_text || null,
        cell.chart_config || null,
        selectedTablesJson
      );
    }
  }

  return getNotebookWithCells(notebookId);
}

/**
 * Delete a notebook and all its cells
 */
export async function deleteNotebook(notebookId: string): Promise<boolean> {
  // Check if notebook exists
  const existing = await dbConnection.query<Notebook>(
    'SELECT * FROM _notebooks WHERE id = ?',
    notebookId
  );

  if (existing.length === 0) {
    return false;
  }

  // Delete cells first (FK constraint)
  await dbConnection.run('DELETE FROM _notebook_cells WHERE notebook_id = ?', notebookId);

  // Delete notebook
  await dbConnection.run('DELETE FROM _notebooks WHERE id = ?', notebookId);

  return true;
}
