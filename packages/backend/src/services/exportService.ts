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

export type ExportFormat = 'markdown' | 'quackdb';

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
