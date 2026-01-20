import type { CellState } from '@/hooks/useCellManager';

/**
 * Escape table values for markdown
 */
function escapeTableValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\r?\n/g, '\\n').replace(/\|/g, '\\|');
}

/**
 * Format query results as a markdown table
 */
function formatTable(columns: { name: string }[], rows: unknown[][], maxRows = 50): string {
  if (!columns.length) return '*(no columns)*';

  const header = `| ${columns.map((col) => escapeTableValue(col.name)).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const limitedRows = rows.slice(0, maxRows);
  const body = limitedRows.map(
    (row) => `| ${columns.map((_, idx) => escapeTableValue(row?.[idx])).join(' | ')} |`
  );

  if (rows.length > maxRows) {
    body.push(`| ${columns.map((_, idx) => (idx === 0 ? '… (truncated)' : '')).join(' | ')} |`);
  }

  return [header, divider, ...body].join('\n');
}

/**
 * Generate markdown from notebook cells with results
 * This matches what is shown in the preview tab
 */
export function generateMarkdownFromCells(
  notebookName: string,
  cells: CellState[]
): string {
  const sections: string[] = [];

  // Add notebook title (only if name is provided)
  if (notebookName.trim()) {
    sections.push(`# ${notebookName}\n`);
  }

  // Process each cell
  cells.forEach((cell, index) => {
    if (cell.type === 'markdown') {
      sections.push(cell.markdown || `<!-- markdown cell ${index + 1} -->`);
      return;
    }

    // SQL cells
    sections.push(`\`\`\`sql\n${cell.sql || ''}\n\`\`\`\n`);

    if (cell.error) {
      sections.push(`\n\`\`\`text\n${cell.error}\n\`\`\`\n`);
      return;
    }

    if (cell.result) {
      // Show chart if displayMode is 'chart' and image is available
      if (cell.displayMode === 'chart') {
        if (cell.chartImageUrl) {
          sections.push(`\n![Chart for query ${index + 1}](${cell.chartImageUrl})\n`);
        } else {
          // Chart image not available, show a placeholder
          sections.push(`\n*Chart visualization (image not available)*\n`);
        }
      } else {
        // Show table for 'table' displayMode or undefined
        sections.push(formatTable(cell.result.columns, cell.result.rows));
        if (cell.result.truncated) {
          sections.push(
            `\n*(Showing ${cell.result.rows.length} of ${cell.result.rowCount} rows)*\n`
          );
        }
      }
    } else {
      sections.push('*(No results yet)*');
    }
  });

  return sections.join('\n\n');
}
