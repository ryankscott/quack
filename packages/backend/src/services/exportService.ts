import path from 'path';
import fs from 'fs/promises';
import dbConnection from '../db/connection.js';
import { FILE_CONFIG } from '../config.js';
import { generateFileId, validateTableName } from '../utils/csv.js';
import { extractTableNamesFromSQL } from '../utils/query.js';
import { getNotebookWithCells, NotebookWithCells } from './notebookService.js';

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

export type ExportFormat = 'markdown' | 'quackdb';

function escapeIdentifier(identifier: string): string {
  return identifier.replace(/"/g, '""');
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function collectReferencedTableNames(notebook: NotebookWithCells): string[] {
  const tableNames = new Set<string>();

  for (const cell of notebook.cells) {
    if (cell.selected_tables) {
      for (const tableName of cell.selected_tables) {
        if (validateTableName(tableName)) {
          tableNames.add(tableName.toLowerCase());
        }
      }
    }

    if (cell.cell_type === 'sql' && cell.sql_text) {
      const tables = extractTableNamesFromSQL(cell.sql_text);
      for (const tableName of tables) {
        if (validateTableName(tableName)) {
          tableNames.add(tableName.toLowerCase());
        }
      }
    }
  }

  return Array.from(tableNames);
}

/**
 * Export a notebook as markdown with optional embedded chart images
 */
export async function exportNotebookAsMarkdown(
  notebookId: string,
  chartImages?: Record<string, string>
): Promise<string> {
  const notebook = await getNotebookWithCells(notebookId);
  if (!notebook) {
    throw new Error('Notebook not found');
  }

  const sections: string[] = [];
  
  // Add notebook title
  sections.push(`# ${notebook.name}\n`);

  // Process each cell
  notebook.cells.forEach((cell, index) => {
    if (cell.title?.trim()) {
      sections.push(`### ${cell.title}\n`);
    }

    if (cell.cell_type === 'markdown') {
      // Markdown cells are included as-is
      sections.push(cell.markdown_text || `<!-- markdown cell ${index + 1} -->`);
      return;
    }

    // SQL cells
    if (cell.cell_type === 'sql' && cell.sql_text) {
      sections.push(`\`\`\`sql\n${cell.sql_text}\n\`\`\`\n`);
      
      // If there's a chart config and chart image, embed it
      if (cell.chart_config && chartImages?.[cell.id]) {
        const imageDataUrl = chartImages[cell.id];
        sections.push(`\n![Chart](${imageDataUrl})\n`);
      }
    }
  });

  return sections.join('\n\n');
}

/**
 * Export a notebook to a .quackdb file with referenced table data
 */
export async function exportNotebook(
  notebookId: string
): Promise<{ path: string; notebook: NotebookWithCells } | null> {
  // Get notebook
  const notebook = await getNotebookWithCells(notebookId);
  if (!notebook) {
    return null;
  }

  // Create export database file
  await ensureExportDir();
  const exportId = generateFileId();
  const exportPath = path.join(FILE_CONFIG.EXPORT_DIR, `${exportId}.quackdb`);
  const tableNamesToExport = collectReferencedTableNames(notebook);
  let exportAttached = false;
  let exportSucceeded = false;

  try {
    // ATTACH the export database
    await dbConnection.run(`ATTACH '${exportPath}' AS export;`);
    exportAttached = true;

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

    // Copy only metadata for tables referenced by the notebook.
    await dbConnection.run(`
      CREATE TABLE export._files AS 
      SELECT * FROM _files WHERE 1 = 0;
    `);

    await dbConnection.run(`
      CREATE TABLE export._tables AS 
      SELECT * FROM _tables WHERE 1 = 0;
    `);

    if (tableNamesToExport.length > 0) {
      const tableList = tableNamesToExport.map((name) => `'${escapeSqlLiteral(name)}'`).join(', ');

      await dbConnection.run(`
        INSERT INTO export._tables
        SELECT * FROM _tables
        WHERE lower(name) IN (${tableList});
      `);

      await dbConnection.run(`
        INSERT INTO export._files
        SELECT DISTINCT f.*
        FROM _files f
        JOIN _tables t ON t.source_file_id = f.id
        WHERE lower(t.name) IN (${tableList});
      `);
    }

    // Copy referenced tables.
    for (const tableName of tableNamesToExport) {
      const tableExists = await dbConnection.query<{ count: bigint | number }>(
        `SELECT COUNT(*) as count
         FROM information_schema.tables
         WHERE table_schema = 'main' AND lower(table_name) = lower(?)`,
        tableName
      );

      if (Number(tableExists[0]?.count ?? 0) === 0) {
        throw new Error(`Notebook references table "${tableName}" but it does not exist`);
      }

      const escapedTableName = escapeIdentifier(tableName);
      await dbConnection.run(`
        CREATE TABLE export."${escapedTableName}" AS 
        SELECT * FROM "${escapedTableName}";
      `);
    }

    exportSucceeded = true;
    return { path: exportPath, notebook };
  } finally {
    if (exportAttached) {
      await dbConnection.run('DETACH export;');
    }

    if (!exportSucceeded) {
      await fs.unlink(exportPath).catch(() => undefined);
    }
  }
}
