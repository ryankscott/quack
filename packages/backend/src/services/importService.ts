import path from 'path';
import fs from 'fs/promises';
import dbConnection from '../db/connection.js';
import { FILE_CONFIG } from '../config.js';
import { generateFileId, validateTableName } from '../utils/csv.js';
import {
  getNotebookWithCells,
  Notebook,
  NotebookCell,
  NotebookWithCells,
} from './notebookService.js';

/**
 * Ensure export directory exists
 */
async function ensureExportDir(): Promise<void> {
  try {
    await fs.mkdir(FILE_CONFIG.EXPORT_DIR, { recursive: true });
  } catch (_err) {
    // Ignore if already exists
  }
}

function escapeIdentifier(identifier: string): string {
  return identifier.replace(/"/g, '""');
}

/**
 * Import a notebook from a .quackdb file
 */
export async function importNotebook(fileBuffer: Buffer): Promise<NotebookWithCells | null> {
  // Save uploaded file temporarily
  await ensureExportDir();
  const tempPath = path.join(FILE_CONFIG.EXPORT_DIR, `temp_${generateFileId()}.quackdb`);
  await fs.writeFile(tempPath, fileBuffer);
  let importAttached = false;
  let transactionStarted = false;

  try {
    // ATTACH the import database
    await dbConnection.run(`ATTACH '${tempPath}' AS import;`);
    importAttached = true;

    // Get notebook from import database
    const importedNotebooks = await dbConnection.query<Notebook>(
      'SELECT * FROM import._notebooks;'
    );

    if (importedNotebooks.length === 0) {
      return null;
    }

    const importedNotebook = importedNotebooks[0];
    if (!importedNotebook) {
      return null;
    }

    const importedCells = await dbConnection.query<NotebookCell>(
      'SELECT * FROM import._notebook_cells ORDER BY cell_index ASC;'
    );

    const importedTables = await dbConnection.query<{ name: string }>(
      `SELECT table_name as name
       FROM information_schema.tables
       WHERE table_catalog = 'import'
         AND table_schema = 'main'
         AND substr(table_name, 1, 1) <> '_'`
    );

    for (const table of importedTables) {
      if (!validateTableName(table.name)) {
        throw new Error(`Import file contains unsupported table name "${table.name}"`);
      }

      const existing = await dbConnection.query<{ count: bigint | number }>(
        `SELECT COUNT(*) as count
         FROM information_schema.tables
         WHERE table_catalog <> 'import'
           AND table_schema = 'main'
           AND lower(table_name) = lower(?)`,
        table.name
      );

      if (Number(existing[0]?.count ?? 0) > 0) {
        throw new Error(`Cannot import notebook because table "${table.name}" already exists`);
      }
    }

    const newNotebookId = generateFileId();
    await dbConnection.run('BEGIN TRANSACTION');
    transactionStarted = true;

    // Insert notebook with new ID
    await dbConnection.run(
      'INSERT INTO _notebooks (id, name, markdown) VALUES (?, ?, ?)',
      newNotebookId,
      importedNotebook.name,
      importedNotebook.markdown
    );

    // Insert cells
    for (const cell of importedCells) {
      const cellId = generateFileId();
      await dbConnection.run(
        `INSERT INTO _notebook_cells 
           (id, notebook_id, cell_index, title, cell_type, sql_text, markdown_text, chart_config, selected_tables)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        cellId,
        newNotebookId,
        cell.cell_index,
        cell.title || null,
        cell.cell_type,
        cell.sql_text,
        cell.markdown_text,
        cell.chart_config,
        cell.selected_tables
      );
    }

    for (const table of importedTables) {
      const escapedTableName = escapeIdentifier(table.name);
      await dbConnection.run(`
        CREATE TABLE "${escapedTableName}" AS 
        SELECT * FROM import."${escapedTableName}";
      `);

      await dbConnection.run(
        'INSERT INTO _tables (id, name, source_file_id) VALUES (?, ?, ?)',
        generateFileId(),
        table.name,
        null
      );
    }

    await dbConnection.run('COMMIT');
    transactionStarted = false;

    // Return the imported notebook
    return getNotebookWithCells(newNotebookId);
  } catch (error) {
    if (transactionStarted) {
      await dbConnection.run('ROLLBACK');
    }
    throw error;
  } finally {
    if (importAttached) {
      await dbConnection.run('DETACH import;');
    }

    // Clean up temporary file
    await fs.unlink(tempPath).catch(() => undefined);
  }
}
