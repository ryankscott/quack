import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CellState } from '@/hooks/useCellManager';

interface WorkspacePreviewProps {
  cells: CellState[];
}

/**
 * Preview mode display for workspace showing generated markdown
 */
export function WorkspacePreview({ cells }: WorkspacePreviewProps) {
  const markdownPreview = useMemo(() => {
    const escapeTableValue = (value: unknown) => {
      if (value === null || value === undefined) return '';
      return String(value).replace(/\r?\n/g, '\\n').replace(/\|/g, '\\|');
    };

    const formatTable = (columns: { name: string }[], rows: unknown[][], maxRows = 50) => {
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
    };

    const sections: string[] = [];

    cells.forEach((cell, index) => {
      if (cell.type === 'markdown') {
        sections.push(cell.markdown || `<!-- markdown cell ${index + 1} -->`);
        return;
      }

      sections.push(`\n\`\`\`sql\n${cell.sql || ''}\n\`\`\`\n`);

      if (cell.error) {
        sections.push(`\n\`\`\`text\n${cell.error}\n\`\`\`\n`);
        return;
      }

      if (cell.result) {
        sections.push(formatTable(cell.result.columns, cell.result.rows));
        if (cell.result.truncated) {
          sections.push(
            `\n*(Showing ${cell.result.rows.length} of ${cell.result.rowCount} rows)*\n`
          );
        }
      } else {
        sections.push('*(No results yet)*');
      }
    });

    return sections.join('\n\n');
  }, [cells]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="bg-white border border-quack-dark border-opacity-10 rounded-lg p-4 shadow-sm">
        <div className="text-xs uppercase text-quack-dark text-opacity-60 mb-2">
          Preview (Markdown)
        </div>
        <div className="markdown-preview">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownPreview}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
