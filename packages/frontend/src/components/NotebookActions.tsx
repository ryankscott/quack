import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  useExportNotebook,
  useImportNotebook,
  useNotebook,
  ExportFormat,
} from '../hooks/useNotebooks';
import { generateMarkdownFromCells } from '@/lib/markdown-export';
import { captureChartByCellId } from '@/lib/chart-capture';
import type { CellState } from '@/hooks/useCellManager';

interface NotebookActionsProps {
  notebookId: string | null;
  cells?: CellState[];
  notebookName?: string;
  variant?: 'panel' | 'toolbar';
  className?: string;
}

export function NotebookActions({
  notebookId,
  cells,
  notebookName,
  variant = 'panel',
  className,
}: NotebookActionsProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('quackdb');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMutation = useExportNotebook();
  const importMutation = useImportNotebook();
  const notebookQuery = useNotebook(notebookId);

  const handleExport = async () => {
    if (!notebookId) {
      toast.error('Please select or create a notebook first');
      return;
    }

    setIsExporting(true);
    try {
      if (exportFormat === 'markdown') {
        // Generate markdown client-side with results if cells are available
        if (cells && cells.length > 0) {
          const name = notebookName || notebookQuery.data?.name || 'notebook';

          // Capture chart images for cells in chart mode
          const cellsWithChartImages: CellState[] = await Promise.all(
            cells.map(async (cell) => {
              if (cell.displayMode === 'chart' && cell.chartConfig && cell.result) {
                try {
                  const chartImageUrl = await captureChartByCellId(cell.id);
                  return { ...cell, chartImageUrl: chartImageUrl || undefined };
                } catch (error) {
                  console.error(`Failed to capture chart for cell ${cell.id}:`, error);
                  return cell;
                }
              }
              return cell;
            })
          );

          const markdown = generateMarkdownFromCells(name, cellsWithChartImages);

          // Create download link
          const blob = new Blob([markdown], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${name}.md`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          toast.success('Notebook exported as markdown');
        } else {
          // Fall back to backend export if cells not available (e.g., panel variant)
          const blob = await exportMutation.mutateAsync({
            notebookId,
            format: exportFormat,
          });

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const name = notebookQuery.data?.name || 'notebook';
          a.download = `${name}.md`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          toast.success('Notebook exported as markdown');
        }
      } else {
        // .quackdb export uses backend
        const blob = await exportMutation.mutateAsync({
          notebookId,
          format: exportFormat,
        });

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = notebookQuery.data?.name || 'notebook';
        a.download = `${name}.quackdb`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Notebook exported as .quackdb');
      }
    } catch (error) {
      toast.error(`Export failed: ${(error as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      await importMutation.mutateAsync(file);
      toast.success('Notebook imported successfully');
    } catch (error) {
      toast.error(`Import failed: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (variant === 'toolbar') {
    return (
      <div className={`flex items-center gap-2 ${className ?? ''}`.trim()}>
        <label className="sr-only" htmlFor="export-format">
          Export format
        </label>
        <select
          id="export-format"
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
          className="input-base text-sm w-32"
          disabled={isExporting}
        >
          <option value="markdown">Markdown</option>
          <option value="quackdb">.quackdb</option>
        </select>
        <button
          onClick={handleExport}
          disabled={isExporting || !notebookId}
          className="btn-secondary text-sm"
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
        <button
          onClick={handleImportClick}
          disabled={isImporting}
          className="btn-secondary text-sm"
        >
          {isImporting ? 'Importing...' : 'Import'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".quackdb"
          onChange={handleImportChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div
      className={`border-t border-quack-dark border-opacity-10 p-4 space-y-4 ${className ?? ''}`.trim()}
    >
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Export Notebook</h3>
        <div className="flex items-center gap-2">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
            className="input-base"
            disabled={isExporting}
          >
            <option value="markdown">Markdown</option>
            <option value="quackdb">.quackdb</option>
          </select>
          <button
            onClick={handleExport}
            disabled={isExporting || !notebookId}
            className="btn-primary text-sm"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
        <p className="text-xs text-quack-dark text-opacity-60">
          {exportFormat === 'markdown'
            ? 'Exports notebook as readable markdown file with query results and charts'
            : 'Exports notebook with referenced table data as portable .quackdb file'}
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Import Notebook</h3>
        <button
          onClick={handleImportClick}
          disabled={isImporting}
          className="btn-secondary text-sm"
        >
          {isImporting ? 'Importing...' : 'Import from .quackdb'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".quackdb"
          onChange={handleImportChange}
          className="hidden"
        />
        <p className="text-xs text-quack-dark text-opacity-60">
          Import a notebook from a previously exported .quackdb file
        </p>
      </div>
    </div>
  );
}
