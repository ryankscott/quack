import { useState } from 'react';
import type { CellState } from '@/hooks/useCellManager';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownCellProps {
  cell: CellState;
  cellIndex: number;
  totalCells: number;
  onUpdate: (updates: Partial<CellState>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function MarkdownCell({
  cell,
  cellIndex,
  totalCells,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: MarkdownCellProps) {
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="bg-white border border-quack-dark border-opacity-10 rounded-lg shadow-sm mb-6">
      <div className="flex items-center justify-between p-3 border-b border-quack-dark border-opacity-10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-quack-dark">Markdown Cell</span>
          <button
            onClick={() => setShowPreview((prev) => !prev)}
            className="text-xs text-quack-dark text-opacity-60 hover:text-opacity-100"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {onMoveUp && cellIndex > 0 && (
            <Button variant="ghost" onClick={onMoveUp} title="Move up">
              <ChevronUp size={18} />
            </Button>
          )}
          {onMoveDown && cellIndex < totalCells - 1 && (
            <Button variant="ghost" onClick={onMoveDown} title="Move down">
              <ChevronDown size={18} />
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700"
            title="Remove cell"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <textarea
          value={cell.markdown}
          onChange={(e) => onUpdate({ markdown: e.target.value })}
          className="w-full min-h-[120px] border border-quack-dark border-opacity-10 rounded-md p-3 text-sm"
          placeholder="Write markdown here..."
        />
        {showPreview && (
          <div className="border border-quack-dark border-opacity-10 rounded-md p-3 bg-quack-gold bg-opacity-5">
            <div className="text-xs uppercase text-quack-dark text-opacity-60 mb-2">Preview</div>
            <div className="markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {cell.markdown || 'Nothing to preview yet.'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
