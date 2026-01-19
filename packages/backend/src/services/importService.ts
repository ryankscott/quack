import path from 'path';
import fs from 'fs/promises';
import dbConnection from '../db/connection.js';
import { generateFileId } from '../utils/csv.js';
import {
  getNotebookWithCells,
  Notebook,
  NotebookCell,
  NotebookWithCells,
} from './notebookService.js';

const EXPORT_DIR = path.join(process.cwd(), 'packages', 'backend', 'data', 'exports');

/**
 * Ensure export directory exists
 */
async function ensureExportDir(): Promise<void> {
  try {
    await fs.mkdir(EXPORT_DIR, { recursive: true });
  } catch (_err) {
    // Ignore if already exists
  }
}

/**
 * Import a notebook from a .quackdb file
 */
export async function importNotebook(fileBuffer: Buffer): Promise<NotebookWithCells | null> {
  // Save uploaded file temporarily
  await ensureExportDir();
  const tempPath = path.join(EXPORT_DIR, `temp_${generateFileId()}.quackdb`);
  await fs.writeFile(tempPath, fileBuffer);

  try {
    // ATTACH the import database
    await dbConnection.run(`ATTACH '${tempPath}' AS import;`);

    // Get notebook from import database
    const importedNotebooks = await dbConnection.query<Notebook>(
      'SELECT * FROM import._notebooks;'
    );

    if (importedNotebooks.length === 0) {
      await dbConnection.run(`DETACH import;`);
      return null;
    }

    const importedNotebook = importedNotebooks[0];
    if (!importedNotebook) {
      await dbConnection.run(`DETACH import;`);
      return null;
    }
    const newNotebookId = generateFileId();

    // Insert notebook with new ID
    await dbConnection.run(
      'INSERT INTO _notebooks (id, name, markdown) VALUES (?, ?, ?)',
      newNotebookId,
      importedNotebook.name,
      importedNotebook.markdown
    );

    // Insert cells
    const importedCells = await dbConnection.query<NotebookCell>(
      'SELECT * FROM import._notebook_cells ORDER BY cell_index ASC;'
    );

    for (const cell of importedCells) {
      const cellId = generateFileId();
      await dbConnection.run(
        `INSERT INTO _notebook_cells 
           (id, notebook_id, cell_index, cell_type, sql_text, markdown_text, chart_config)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        cellId,
        newNotebookId,
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
      } catch (_err) {
        // Table import failed, skip
      }
    }

    // DETACH import database
    await dbConnection.run(`DETACH import;`);

    // Return the imported notebook
    return getNotebookWithCells(newNotebookId);
  } finally {
    // Clean up temporary file
    try {
      await fs.unlink(tempPath);
    } catch (_err) {
      // Ignore
    }
  }
}
