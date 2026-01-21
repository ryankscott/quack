import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { CellState } from '@/hooks/useCellManager';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2Icon } from 'lucide-react';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface MarkdownCellRef {
  scrollIntoView: () => void;
  focus: () => void;
}

interface MarkdownCellProps {
  cell: CellState;
  cellIndex: number;
  totalCells: number;
  onUpdate: (updates: Partial<CellState>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const MarkdownCell = forwardRef<MarkdownCellRef, MarkdownCellProps>(function MarkdownCell(
  {
    cell,
    cellIndex,
    totalCells,
    onUpdate,
    onRemove,
    onMoveUp,
    onMoveDown,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasPreview = !!cell.markdown?.trim();

  useImperativeHandle(ref, () => ({
    scrollIntoView: () => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  return (
    <div ref={containerRef} className="bg-white border border-quack-dark border-opacity-10 rounded-lg shadow-sm mb-6">
      <div className="flex items-center justify-between p-2 border-b border-quack-dark border-opacity-10 bg-quack-gold bg-opacity-5">
        <div className="flex items-center gap-2">
          <div className="flex gap-2 px-2 items-center">
            <p className="text-xs text-quack-dark text-opacity-60 font-mono">
              Cell {cellIndex + 1}
            </p>
          </div>
        </div>

        {/* Right side: Move up/down and delete */}
        <div className="flex items-center gap-1">
          {cellIndex > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onMoveUp}
              title="Move up"
            >
              <ChevronUp size={16} />
            </Button>
          )}
          {cellIndex < totalCells - 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onMoveDown}
              title="Move down"
            >
              <ChevronDown size={16} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:text-red-600"
            onClick={onRemove}
            title="Remove cell"
          >
            <Trash2Icon size={16} />
          </Button>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <Collapsible open={!cell.isEditorCollapsed}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase text-quack-dark text-opacity-60 font-semibold">
              Editor
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => onUpdate({ isEditorCollapsed: !cell.isEditorCollapsed })}
              title={cell.isEditorCollapsed ? 'Show editor' : 'Hide editor'}
            >
              {cell.isEditorCollapsed ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className="ml-1 text-xs">{cell.isEditorCollapsed ? 'Show' : 'Hide'}</span>
            </Button>
          </div>
          <CollapsibleContent>
            <textarea
              ref={textareaRef}
              value={cell.markdown}
              onChange={(e) => onUpdate({ markdown: e.target.value })}
              className="w-full min-h-[120px] border border-quack-dark border-opacity-10 rounded-md p-3 text-sm"
              placeholder="Write markdown here..."
            />
          </CollapsibleContent>
        </Collapsible>

        {hasPreview && (
          <Collapsible open={!cell.isPreviewCollapsed}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase text-quack-dark text-opacity-60 font-semibold">
                Preview
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => onUpdate({ isPreviewCollapsed: !cell.isPreviewCollapsed })}
                title={cell.isPreviewCollapsed ? 'Show preview' : 'Hide preview'}
              >
                {cell.isPreviewCollapsed ? <EyeOff size={14} /> : <Eye size={14} />}
                <span className="ml-1 text-xs">{cell.isPreviewCollapsed ? 'Show' : 'Hide'}</span>
              </Button>
            </div>
            <CollapsibleContent>
              <div className="border border-quack-dark border-opacity-10 rounded-md p-3 bg-quack-gold bg-opacity-5">
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
});
