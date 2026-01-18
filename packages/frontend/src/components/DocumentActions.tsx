import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useExportDocument, useImportDocument, DataMode } from '../hooks/useDocuments';

interface DocumentActionsProps {
  documentId: string | null;
  variant?: 'panel' | 'toolbar';
  className?: string;
}

export function DocumentActions({
  documentId,
  variant = 'panel',
  className,
}: DocumentActionsProps) {
  const [dataMode, setDataMode] = useState<DataMode>('query-results');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMutation = useExportDocument();
  const importMutation = useImportDocument();

  const handleExport = async () => {
    if (!documentId) {
      toast.error('Please select or create a document first');
      return;
    }

    setIsExporting(true);
    try {
      const blob = await exportMutation.mutateAsync({
        documentId,
        dataMode,
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document_${new Date().getTime()}.quackdb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
      toast.success('Document imported successfully');
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
        <label className="sr-only" htmlFor="export-data-mode">
          Export data
        </label>
        <select
          id="export-data-mode"
          value={dataMode}
          onChange={(e) => setDataMode(e.target.value as DataMode)}
          className="input-base text-sm w-44"
          disabled={isExporting}
        >
          <option value="none">No data</option>
          <option value="query-results">Query results only</option>
          <option value="referenced-tables">Referenced tables</option>
          <option value="full-db">Full database</option>
        </select>
        <button
          onClick={handleExport}
          disabled={isExporting || !documentId}
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
        <h3 className="font-semibold text-sm">Export Document</h3>
        <div className="flex items-center gap-2">
          <select
            value={dataMode}
            onChange={(e) => setDataMode(e.target.value as DataMode)}
            className="input-base"
            disabled={isExporting}
          >
            <option value="none">No data</option>
            <option value="query-results">Query results only</option>
            <option value="referenced-tables">Referenced tables</option>
            <option value="full-db">Full database</option>
          </select>
          <button
            onClick={handleExport}
            disabled={isExporting || !documentId}
            className="btn-primary text-sm"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
        <p className="text-xs text-quack-dark text-opacity-60">
          Exports document with cells and selected data as a portable .quackdb file
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Import Document</h3>
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
          Import a document from a previously exported .quackdb file
        </p>
      </div>
    </div>
  );
}
