import type { CellState } from '@/hooks/useCellManager';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, ChevronRight, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
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
  const hasPreview = !!cell.markdown?.trim();

  return (
    <div className="bg-white border border-quack-dark border-opacity-10 rounded-lg shadow-sm mb-6">
      <div className="flex items-center justify-between p-3 border-b border-quack-dark border-opacity-10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-quack-dark">Markdown Cell</span>

          {/* Collapse toggle buttons */}
          <div className="flex items-center gap-0.5 border-l border-quack-dark border-opacity-10 pl-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onUpdate({ isEditorCollapsed: !cell.isEditorCollapsed })}
              title={cell.isEditorCollapsed ? 'Show editor' : 'Hide editor'}
            >
              {cell.isEditorCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </Button>
            {hasPreview && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onUpdate({ isPreviewCollapsed: !cell.isPreviewCollapsed })}
                title={cell.isPreviewCollapsed ? 'Show preview' : 'Hide preview'}
              >
                {cell.isPreviewCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </Button>
            )}
          </div>
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
        <Collapsible open={!cell.isEditorCollapsed}>
          <CollapsibleContent>
            <textarea
              value={cell.markdown}
              onChange={(e) => onUpdate({ markdown: e.target.value })}
              className="w-full min-h-[120px] border border-quack-dark border-opacity-10 rounded-md p-3 text-sm"
              placeholder="Write markdown here..."
            />
          </CollapsibleContent>
        </Collapsible>

        {hasPreview && (
          <Collapsible open={!cell.isPreviewCollapsed}>
            <CollapsibleContent>
              <div className="border border-quack-dark border-opacity-10 rounded-md p-3 bg-quack-gold bg-opacity-5">
                <div className="text-xs uppercase text-quack-dark text-opacity-60 mb-2">
                  Preview
                </div>
                <div className="markdown-preview">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{cell.markdown}</ReactMarkdown>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
