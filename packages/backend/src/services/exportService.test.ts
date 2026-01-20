import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import dbConnection from '../db/connection.js';
import { initializeSchema } from '../db/schema.js';
import { createNotebook } from './notebookService.js';
import { exportNotebookAsMarkdown } from './exportService.js';

describe('exportNotebookAsMarkdown', () => {
  beforeAll(async () => {
    await dbConnection.initialize();
    await initializeSchema();
  });

  afterAll(async () => {
    await dbConnection.close();
  });

  it('exports a notebook with markdown cells', async () => {
    const notebook = await createNotebook({
      name: 'Test Notebook',
      cells: [
        {
          cell_type: 'markdown',
          markdown_text: '# Hello World\n\nThis is a test.',
        },
      ],
    });

    if (!notebook) {
      throw new Error('Failed to create notebook');
    }

    const markdown = await exportNotebookAsMarkdown(notebook.id);

    expect(markdown).toContain('# Test Notebook');
    expect(markdown).toContain('# Hello World');
    expect(markdown).toContain('This is a test.');
  });

  it('exports a notebook with SQL cells', async () => {
    const notebook = await createNotebook({
      name: 'SQL Notebook',
      cells: [
        {
          cell_type: 'sql',
          sql_text: 'SELECT * FROM users LIMIT 10;',
        },
      ],
    });

    if (!notebook) {
      throw new Error('Failed to create notebook');
    }

    const markdown = await exportNotebookAsMarkdown(notebook.id);

    expect(markdown).toContain('# SQL Notebook');
    expect(markdown).toContain('```sql');
    expect(markdown).toContain('SELECT * FROM users LIMIT 10;');
    expect(markdown).toContain('```');
  });

  it('exports a notebook with mixed cell types', async () => {
    const notebook = await createNotebook({
      name: 'Mixed Notebook',
      cells: [
        {
          cell_type: 'markdown',
          markdown_text: '## Introduction\n\nThis notebook contains SQL queries.',
        },
        {
          cell_type: 'sql',
          sql_text: 'SELECT COUNT(*) FROM orders;',
        },
        {
          cell_type: 'markdown',
          markdown_text: '## Conclusion\n\nAnalysis complete.',
        },
      ],
    });

    if (!notebook) {
      throw new Error('Failed to create notebook');
    }

    const markdown = await exportNotebookAsMarkdown(notebook.id);

    expect(markdown).toContain('# Mixed Notebook');
    expect(markdown).toContain('## Introduction');
    expect(markdown).toContain('This notebook contains SQL queries.');
    expect(markdown).toContain('```sql');
    expect(markdown).toContain('SELECT COUNT(*) FROM orders;');
    expect(markdown).toContain('## Conclusion');
    expect(markdown).toContain('Analysis complete.');
  });

  it('includes chart images when provided', async () => {
    const notebook = await createNotebook({
      name: 'Chart Notebook',
      cells: [
        {
          cell_type: 'sql',
          sql_text: 'SELECT category, COUNT(*) FROM products GROUP BY category;',
          chart_config: JSON.stringify({ type: 'bar', xKey: 'category', yKey: 'count' }),
        },
      ],
    });

    if (!notebook) {
      throw new Error('Failed to create notebook');
    }

    const cellId = notebook.cells[0]?.id;
    if (!cellId) {
      throw new Error('Cell ID not found');
    }

    const chartImages = {
      [cellId]: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const markdown = await exportNotebookAsMarkdown(notebook.id, chartImages);

    expect(markdown).toContain('# Chart Notebook');
    expect(markdown).toContain('```sql');
    expect(markdown).toContain('SELECT category, COUNT(*) FROM products GROUP BY category;');
    expect(markdown).toContain('![Chart]');
    expect(markdown).toContain('data:image/png;base64,');
  });

  it('throws error for non-existent notebook', async () => {
    await expect(exportNotebookAsMarkdown('non-existent-id')).rejects.toThrow('Notebook not found');
  });

  it('handles empty notebook', async () => {
    const notebook = await createNotebook({
      name: 'Empty Notebook',
    });

    if (!notebook) {
      throw new Error('Failed to create notebook');
    }

    const markdown = await exportNotebookAsMarkdown(notebook.id);

    expect(markdown).toContain('# Empty Notebook');
    expect(markdown.trim()).toBe('# Empty Notebook');
  });
});
