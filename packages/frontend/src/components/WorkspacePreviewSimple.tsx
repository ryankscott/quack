import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CellState } from '@/hooks/useCellManager';
import { ChartViewer } from './ChartViewer';
import { ResultTable } from './ResultTable';

interface WorkspacePreviewSimpleProps {
  cells: CellState[];
}

/**
 * Simplified preview that renders charts and tables directly instead of trying to convert to images
 */
export function WorkspacePreviewSimple({ cells }: WorkspacePreviewSimpleProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="bg-white border border-quack-dark border-opacity-10 rounded-lg p-4 shadow-sm">
        <div className="text-xs uppercase text-quack-dark text-opacity-60 mb-4">Preview</div>
        <div className="space-y-6">
          {cells.map((cell) => {
            if (cell.type === 'markdown') {
              return (
                <div key={cell.id} className="markdown-preview">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{cell.markdown || ''}</ReactMarkdown>
                </div>
              );
            }

            // SQL cell
            return (
              <div key={cell.id} className="space-y-2">
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <pre className="text-sm overflow-x-auto">
                    <code>{cell.sql}</code>
                  </pre>
                </div>

                {cell.error && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded">
                    <pre className="text-sm text-red-700">{cell.error}</pre>
                  </div>
                )}

                {cell.result && (
                  <div>
                    {cell.displayMode === 'chart' && cell.chartConfig ? (
                      <div className="border border-quack-dark border-opacity-10 rounded h-[400px]">
                        <ChartViewer config={cell.chartConfig} result={cell.result} />
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-auto border border-quack-dark border-opacity-10 rounded">
                        <ResultTable result={cell.result} />
                      </div>
                    )}
                    {cell.result.truncated && (
                      <div className="text-sm text-gray-600 mt-2">
                        Showing {cell.result.rows.length} of {cell.result.rowCount} rows
                      </div>
                    )}
                  </div>
                )}

                {!cell.result && !cell.error && (
                  <div className="text-gray-500 italic">No results yet</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
