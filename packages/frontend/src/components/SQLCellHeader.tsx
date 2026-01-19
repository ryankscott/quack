import { ChevronUp, ChevronDown, Trash2Icon } from 'lucide-react';
import { Button } from './ui/button';

interface SQLCellHeaderProps {
  cellIndex: number;
  totalCells: number;
  isExecuting: boolean;
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
  onMoveUp,
  onMoveDown,
  onRemove,
}: SQLCellHeaderProps) {
  return (
    <div className="flex row justify-between align-center gap-2 p-2 w-full border-b border-quack-dark border-opacity-10 bg-quack-gold bg-opacity-5">
      <div className='flex gap-2 items-center'>
        <div className='flex gap-2 px-2 items-center'>
          <p className="text-xs text-quack-dark text-opacity-60 font-mono">
            Cell {cellIndex + 1}
          </p>
          {isExecuting && <p className="text-xs text-quack-orange">Executing...</p>}
        </div>
      </div>

      {/* Right side: Move up/down and delete */}
      <div className="flex items-center gap-1">
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
          <Trash2Icon size={16} />
        </Button>
      </div>
    </div>
  );
}
