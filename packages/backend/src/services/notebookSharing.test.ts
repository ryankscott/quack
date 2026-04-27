import fs from 'fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import dbConnection from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';
import { createNotebook, deleteNotebook } from './notebookService.js';
import { exportNotebook } from './exportService.js';
import { importNotebook } from './importService.js';

async function dropTableIfExists(tableName: string): Promise<void> {
  await dbConnection.run(`DROP TABLE IF EXISTS "${tableName}"`);
  await dbConnection.run('DELETE FROM _tables WHERE name = ?', tableName);
}

describe('Notebook sharing', () => {
  beforeAll(async () => {
    await dbConnection.initialize();
    await initializeSchema();
  });

  afterAll(async () => {
    await dbConnection.close();
  });

  it('round-trips notebook bundles with selected tables and only referenced data tables', async () => {
    const salesTable = 'shared_sales';
    const inventoryTable = 'shared_inventory';
    const ignoredTable = 'ignored_table';
    const exportSchema = 'exported_bundle';

    await dbConnection.run(`CREATE TABLE "${salesTable}" (id INTEGER, label TEXT)`);
    await dbConnection.run(`INSERT INTO "${salesTable}" VALUES (1, 'sales row')`);
    await dbConnection.run(`CREATE TABLE "${inventoryTable}" (id INTEGER, label TEXT)`);
    await dbConnection.run(`INSERT INTO "${inventoryTable}" VALUES (1, 'inventory row')`);
    await dbConnection.run(`CREATE TABLE "${ignoredTable}" (id INTEGER, label TEXT)`);
    await dbConnection.run(`INSERT INTO "${ignoredTable}" VALUES (1, 'ignore me')`);

    const notebook = await createNotebook({
      name: 'Shared notebook',
      cells: [
        {
          title: 'Revenue query',
          cell_type: 'sql',
          sql_text: `SELECT * FROM ${salesTable}`,
          selected_tables: [salesTable, inventoryTable],
        },
        {
          title: 'Summary',
          cell_type: 'markdown',
          markdown_text: '## Shared notebook',
        },
      ],
    });

    if (!notebook) {
      throw new Error('Failed to create notebook');
    }

    const exported = await exportNotebook(notebook.id);
    if (!exported) {
      throw new Error('Failed to export notebook');
    }

    await dbConnection.run(`ATTACH '${exported.path}' AS ${exportSchema}`);

    try {
      const exportedCells = await dbConnection.query<{ title: string | null; selected_tables: string | null }>(
        `SELECT title, selected_tables FROM ${exportSchema}._notebook_cells ORDER BY cell_index ASC`
      );
      expect(exportedCells[0]?.title).toBe('Revenue query');
      expect(exportedCells[0]?.selected_tables).toBe(JSON.stringify([salesTable, inventoryTable]));

      const exportedSalesRows = await dbConnection.query<{ id: number; label: string }>(
        `SELECT * FROM ${exportSchema}."${salesTable}"`
      );
      const exportedInventoryRows = await dbConnection.query<{ id: number; label: string }>(
        `SELECT * FROM ${exportSchema}."${inventoryTable}"`
      );

      expect(exportedSalesRows).toHaveLength(1);
      expect(exportedInventoryRows).toHaveLength(1);
      await expect(
        dbConnection.query(`SELECT * FROM ${exportSchema}."${ignoredTable}"`)
      ).rejects.toThrow();
    } finally {
      await dbConnection.run(`DETACH ${exportSchema}`);
    }

    const exportBuffer = await fs.readFile(exported.path);

    await deleteNotebook(notebook.id);
    await dropTableIfExists(salesTable);
    await dropTableIfExists(inventoryTable);

    const imported = await importNotebook(exportBuffer);

    expect(imported?.cells[0]?.title).toBe('Revenue query');
    expect(imported?.cells[0]?.selected_tables).toEqual([salesTable, inventoryTable]);

    const importedSalesRows = await dbConnection.query<{ id: number; label: string }>(
      `SELECT * FROM "${salesTable}"`
    );
    const importedInventoryRows = await dbConnection.query<{ id: number; label: string }>(
      `SELECT * FROM "${inventoryTable}"`
    );
    const importedMetadata = await dbConnection.query<{ name: string; source_file_id: string | null }>(
      `SELECT name, source_file_id FROM _tables WHERE name IN (?, ?) ORDER BY name`,
      inventoryTable,
      salesTable
    );

    expect(importedSalesRows).toEqual([{ id: 1, label: 'sales row' }]);
    expect(importedInventoryRows).toEqual([{ id: 1, label: 'inventory row' }]);
    expect(importedMetadata).toEqual([
      { name: inventoryTable, source_file_id: null },
      { name: salesTable, source_file_id: null },
    ]);

    await fs.unlink(exported.path);
    if (imported) {
      await deleteNotebook(imported.id);
    }
    await dropTableIfExists(salesTable);
    await dropTableIfExists(inventoryTable);
    await dropTableIfExists(ignoredTable);
  });

  it('fails import cleanly when a referenced table already exists locally', async () => {
    const conflictTable = 'conflicting_table';

    await dbConnection.run(`CREATE TABLE "${conflictTable}" (id INTEGER, label TEXT)`);
    await dbConnection.run(`INSERT INTO "${conflictTable}" VALUES (1, 'local row')`);

    const notebook = await createNotebook({
      name: 'Conflict notebook',
      cells: [
        {
          cell_type: 'sql',
          sql_text: `SELECT * FROM ${conflictTable}`,
          selected_tables: [conflictTable],
        },
      ],
    });

    if (!notebook) {
      throw new Error('Failed to create notebook');
    }

    const exported = await exportNotebook(notebook.id);
    if (!exported) {
      throw new Error('Failed to export notebook');
    }

    const exportBuffer = await fs.readFile(exported.path);
    const notebookCountBefore = await dbConnection.query<{ count: bigint | number }>(
      'SELECT COUNT(*) as count FROM _notebooks'
    );

    await expect(importNotebook(exportBuffer)).rejects.toThrow(
      `Cannot import notebook because table "${conflictTable}" already exists`
    );

    const notebookCountAfter = await dbConnection.query<{ count: bigint | number }>(
      'SELECT COUNT(*) as count FROM _notebooks'
    );

    expect(Number(notebookCountAfter[0]?.count ?? 0)).toBe(Number(notebookCountBefore[0]?.count ?? 0));

    await fs.unlink(exported.path);
    await deleteNotebook(notebook.id);
    await dropTableIfExists(conflictTable);
  });
});
