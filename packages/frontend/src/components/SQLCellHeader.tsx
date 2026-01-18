import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { Button } from './ui/button';

interface SQLCellHeaderProps {
  cellIndex: number;
  totalCells: number;
  isExecuting: boolean;
  isDirty: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
}

/**
 * Header section of SQL cell with cell info and action buttons
 */
export function SQLCellHeader({
  cellIndex,
  totalCells,
  isExecuting,
  isDirty,
  onMoveUp,
  onMoveDown,
  onRemove,
}: SQLCellHeaderProps) {
  return (
    <div className="border-b border-quack-dark border-opacity-10 bg-quack-gold bg-opacity-5 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs text-quack-dark text-opacity-60 font-mono">
          Cell {cellIndex + 1}
        </span>
        {isExecuting && <span className="text-xs text-quack-orange">Executing...</span>}
        {isDirty && <span className="text-xs text-quack-gold">• Unsaved</span>}
      </div>
      <div className="flex items-center gap-1">
        {totalCells > 1 && (
          <>
            {cellIndex > 0 && (
              <Button
                onClick={onMoveUp}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Move up"
              >
                <ChevronUp size={16} />
              </Button>
            )}
            {cellIndex < totalCells - 1 && (
              <Button
                onClick={onMoveDown}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Move down"
              >
                <ChevronDown size={16} />
              </Button>
            )}
            <Button
              onClick={onRemove}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:text-red-600"
              title="Remove cell"
            >
              <X size={16} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
