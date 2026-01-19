import { SQLCell } from './SQLCell';
import { MarkdownCell } from './MarkdownCell';
import type { CellState } from '@/hooks/useCellManager';

interface WorkspaceCellListProps {
  cells: CellState[];
  getCellIndex: (cellId: string) => number;
  onUpdateCell: (cellId: string, updates: Partial<CellState>) => void;
  onRemoveCell: (cellId: string) => void;
  onMoveCellUp: (cellId: string) => void;
  onMoveCellDown: (cellId: string) => void;
}

/**
 * List of cells in the workspace
 */
export function WorkspaceCellList({
  cells,
  getCellIndex,
  onUpdateCell,
  onRemoveCell,
  onMoveCellUp,
  onMoveCellDown,
}: WorkspaceCellListProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 w-full">
      {cells.map((cell) =>
        cell.type === 'markdown' ? (
          <MarkdownCell
            key={cell.id}
            cell={cell}
            cellIndex={getCellIndex(cell.id)}
            totalCells={cells.length}
            onUpdate={(updates) => onUpdateCell(cell.id, updates)}
            onRemove={() => onRemoveCell(cell.id)}
            onMoveUp={() => onMoveCellUp(cell.id)}
            onMoveDown={() => onMoveCellDown(cell.id)}
          />
        ) : (
          <SQLCell
            key={cell.id}
            cell={cell}
            cellIndex={getCellIndex(cell.id)}
            totalCells={cells.length}
            onUpdate={(updates) => onUpdateCell(cell.id, updates)}
            onRemove={() => onRemoveCell(cell.id)}
            onMoveUp={() => onMoveCellUp(cell.id)}
            onMoveDown={() => onMoveCellDown(cell.id)}
          />
        )
      )}
    </div>
  );
}
