import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SQLCell } from '@/components/SQLCell';
import { MarkdownCell } from '@/components/MarkdownCell';
import { SavedQueriesList } from '@/components/SavedQueriesList';
import { DocumentActions } from '@/components/DocumentActions';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useCellManager } from '@/hooks/useCellManager';
import type { SavedQuery } from '@/hooks/useQueries';
import { DatabaseZap, NotebookText, Plus, X } from 'lucide-react';
import {
  useDocuments,
  useCreateDocument,
  useUpdateDocument,
  type CreateDocumentRequest,
} from '@/hooks/useDocuments';

export function WorkspacePage() {
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | undefined>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [currentDocumentName, setCurrentDocumentName] = useState('Untitled');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const { cells, addCell, removeCell, updateCell, moveCellUp, moveCellDown, getCellIndex } =
    useCellManager();
  const documentsQuery = useDocuments();
  const createDocumentMutation = useCreateDocument();
  const updateDocumentMutation = useUpdateDocument();

  const handleLoadQuery = (query: SavedQuery) => {
    setSelectedQuery(query);
  };

  const handleAddCell = () => {
    addCell('sql');
  };

  const handleAddMarkdownCell = () => {
    addCell('markdown');
  };

  const handleSaveDocument = async () => {
    if (!currentDocumentId) return;
    const payload: CreateDocumentRequest = {
      name: currentDocumentName.trim() || 'Untitled',
      cells: cells.map((cell) => ({
        cell_type: cell.type,
        sql_text: cell.type === 'sql' ? cell.sql : undefined,
        markdown_text: cell.type === 'markdown' ? cell.markdown : undefined,
      })),
    };

    await updateDocumentMutation.mutateAsync({
      id: currentDocumentId,
      request: payload,
    });
  };

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

      sections.push(`\n\`sql\`\n${cell.sql || ''}\n\`\n`);

      if (cell.error) {
        sections.push(`\n\`text\`\n${cell.error}\n\`\n`);
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

  useEffect(() => {
    if (!documentsQuery.isSuccess || isCreatingDoc || currentDocumentId) return;
    if (documentsQuery.data.length > 0) {
      const firstDoc = documentsQuery.data[0];
      if (firstDoc) {
        setCurrentDocumentId(firstDoc.id);
        setCurrentDocumentName(firstDoc.name);
      }
      return;
    }

    setIsCreatingDoc(true);
    createDocumentMutation
      .mutateAsync({
        name: 'Untitled',
        cells: cells.map((cell) => ({
          cell_type: cell.type,
          sql_text: cell.type === 'sql' ? cell.sql : undefined,
          markdown_text: cell.type === 'markdown' ? cell.markdown : undefined,
        })),
      })
      .then((doc) => {
        setCurrentDocumentId(doc.id);
        setCurrentDocumentName(doc.name);
      })
      .finally(() => setIsCreatingDoc(false));
  }, [documentsQuery.isSuccess, documentsQuery.data, isCreatingDoc, currentDocumentId]);

  const isPreviewMode = mode === 'preview';

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="w-80 border-r border-quack-dark border-opacity-10 bg-white flex flex-col">
          <div className="p-4 border-b border-quack-dark border-opacity-10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-quack-dark">Saved Queries</h2>
            <Button
              onClick={() => setIsSidebarOpen(false)}
              variant="ghost"
              size="sm"
              title="Close sidebar"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SavedQueriesList onLoadQuery={handleLoadQuery} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-quack-gold_bg">
        {/* Toolbar */}
        <div className="p-3 border-b border-quack-dark border-opacity-10 bg-white flex flex-wrap items-center gap-3">
          {!isSidebarOpen && (
            <Button
              onClick={() => setIsSidebarOpen(true)}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Show Saved Queries
            </Button>
          )}

          <div className="flex items-center gap-3">
            <input
              value={currentDocumentName}
              onChange={(e) => setCurrentDocumentName(e.target.value)}
              className="border border-quack-dark border-opacity-20 rounded px-2 py-1 text-sm"
              placeholder="Document name"
              disabled={isPreviewMode}
            />
            <Button
              onClick={handleSaveDocument}
              variant="secondary"
              size="sm"
              disabled={!currentDocumentId || updateDocumentMutation.isPending || isPreviewMode}
            >
              {updateDocumentMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>

          <DocumentActions documentId={currentDocumentId} variant="toolbar" className="flex-wrap" />

          <div className="flex-1" />

          <Tabs value={mode} onValueChange={(value) => setMode(value as 'edit' | 'preview')}>
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {!isPreviewMode && (
          <div className="p-3 border-b border-quack-dark border-opacity-10 bg-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleAddMarkdownCell}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
              >
                <NotebookText className="w-4 h-4" />
                Add Markdown
              </Button>
              <Button
                onClick={handleAddCell}
                variant="default"
                size="sm"
                className="flex items-center gap-2"
              >
                <DatabaseZap className="w-4 h-4" />
                Add SQL
              </Button>
            </div>
          </div>
        )}

        {/* Cells */}
        <div className="flex-1 overflow-y-auto p-4">
          {isPreviewMode ? (
            <div className="bg-white border border-quack-dark border-opacity-10 rounded-lg p-4 shadow-sm">
              <div className="text-xs uppercase text-quack-dark text-opacity-60 mb-2">
                Preview (Markdown)
              </div>
              <div className="markdown-preview">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownPreview}</ReactMarkdown>
              </div>
            </div>
          ) : (
            cells.map((cell) =>
              cell.type === 'markdown' ? (
                <MarkdownCell
                  key={cell.id}
                  cell={cell}
                  cellIndex={getCellIndex(cell.id)}
                  totalCells={cells.length}
                  onUpdate={(updates) => updateCell(cell.id, updates)}
                  onRemove={() => removeCell(cell.id)}
                  onMoveUp={() => moveCellUp(cell.id)}
                  onMoveDown={() => moveCellDown(cell.id)}
                />
              ) : (
                <SQLCell
                  key={cell.id}
                  cell={cell}
                  cellIndex={getCellIndex(cell.id)}
                  totalCells={cells.length}
                  onUpdate={(updates) => updateCell(cell.id, updates)}
                  onRemove={() => removeCell(cell.id)}
                  onMoveUp={() => moveCellUp(cell.id)}
                  onMoveDown={() => moveCellDown(cell.id)}
                  initialQuery={selectedQuery}
                  onQuerySaved={(query) => setSelectedQuery(query)}
                />
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}
