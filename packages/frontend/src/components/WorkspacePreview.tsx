import { useMemo, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CellState } from '@/hooks/useCellManager';
import { ChartViewer } from './ChartViewer';
import { generateChartImage } from '@/lib/chartImageGenerator';

interface WorkspacePreviewProps {
  cells: CellState[];
  onChartImagesGenerated?: (cellId: string, imageUrl: string) => void;
}

/**
 * Preview mode display for workspace showing generated markdown with lazy chart image generation
 */
export function WorkspacePreview({ cells, onChartImagesGenerated }: WorkspacePreviewProps) {
  const [generatingImages, setGeneratingImages] = useState(false);
  const chartRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Generate chart images lazily when preview is shown
  useEffect(() => {
    const generateImages = async () => {
      setGeneratingImages(true);

      for (const cell of cells) {
        if (cell.type === 'sql' && cell.chartConfig && cell.result && !cell.chartImageUrl) {
          const chartElement = chartRefs.current.get(cell.id);
          if (chartElement) {
            try {
              // Wait a bit for chart to fully render
              await new Promise((resolve) => setTimeout(resolve, 500));
              const imageUrl = await generateChartImage(chartElement);
              onChartImagesGenerated?.(cell.id, imageUrl);
            } catch (error) {
              console.error(`Failed to generate image for cell ${cell.id}:`, error);
            }
          }
        }
      }

      setGeneratingImages(false);
    };

    generateImages();
  }, [cells, onChartImagesGenerated]);

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

        // Add chart image if available
        if (cell.chartImageUrl) {
          sections.push(`\n![Chart for query ${index + 1}](${cell.chartImageUrl})\n`);
        }
      } else {
        sections.push('*(No results yet)*');
      }
    });

    return sections.join('\n\n');
  }, [cells]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Hidden chart rendering area for image generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {cells.map((cell) => {
          if (cell.type === 'sql' && cell.chartConfig && cell.result && !cell.chartImageUrl) {
            return (
              <div
                key={cell.id}
                ref={(el) => {
                  if (el) chartRefs.current.set(cell.id, el);
                }}
                style={{ width: '800px', height: '400px' }}
              >
                <ChartViewer config={cell.chartConfig} result={cell.result} />
              </div>
            );
          }
          return null;
        })}
      </div>

      <div className="bg-white border border-quack-dark border-opacity-10 rounded-lg p-4 shadow-sm">
        <div className="text-xs uppercase text-quack-dark text-opacity-60 mb-2">
          Preview (Markdown)
          {generatingImages && (
            <span className="ml-2 text-quack-accent">Generating chart images...</span>
          )}
        </div>
        <div className="markdown-preview">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownPreview}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
