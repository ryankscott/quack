import path from 'path';
import fs from 'fs/promises';
import dbConnection from '../db/connection.js';
import { generateFileId } from '../utils/csv.js';
import { extractTableNamesFromSQL } from '../utils/query.js';
import { getNotebookWithCells, NotebookWithCells } from './notebookService.js';

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

export type DataMode = 'none' | 'query-results' | 'referenced-tables' | 'full-db';

/**
 * Export a notebook to a .quackdb file with optional data
 */
export async function exportNotebook(
  notebookId: string,
  dataMode: DataMode
): Promise<{ path: string; notebook: NotebookWithCells } | null> {
  // Get notebook
  const notebook = await getNotebookWithCells(notebookId);
  if (!notebook) {
    return null;
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
      CREATE TABLE export._notebooks AS 
      SELECT * FROM _notebooks WHERE id = ?;
    `,
      notebookId
    );

    await dbConnection.run(
      `
      CREATE TABLE export._notebook_cells AS 
      SELECT * FROM _notebook_cells WHERE notebook_id = ?;
    `,
      notebookId
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

      for (const cell of notebook.cells) {
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
          } catch (_err) {
            // Table may not exist, skip
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
          const tableName = (Object.values(row as Record<string, unknown>)[0] || '') as string;
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
        } catch (_err) {
          // Table may not exist, skip
        }
      }
    }

    // DETACH export database
    await dbConnection.run(`DETACH export;`);

    return { path: exportPath, notebook };
  } catch (error) {
    // Clean up export file if something went wrong
    try {
      await fs.unlink(exportPath);
    } catch (_unlinkErr) {
      // Ignore
    }
    throw error;
  }
}
