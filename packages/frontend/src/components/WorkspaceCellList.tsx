import { useEffect, useRef } from 'react';
import { SQLCell, type SQLCellRef } from './SQLCell';
import { MarkdownCell, type MarkdownCellRef } from './MarkdownCell';
import type { CellState } from '@/hooks/useCellManager';

interface WorkspaceCellListProps {
  cells: CellState[];
  getCellIndex: (cellId: string) => number;
  onUpdateCell: (cellId: string, updates: Partial<CellState>) => void;
  onRemoveCell: (cellId: string) => void;
  onMoveCellUp: (cellId: string) => void;
  onMoveCellDown: (cellId: string) => void;
  newlyAddedCellId?: string | null;
  onCellFocused?: () => void;
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
  newlyAddedCellId,
  onCellFocused,
}: WorkspaceCellListProps) {
  const cellRefs = useRef<Map<string, SQLCellRef | MarkdownCellRef>>(new Map());

  // Scroll to and focus newly added cell
  useEffect(() => {
    if (!newlyAddedCellId) return;

    // Use a small delay to ensure the cell is rendered
    const timeoutId = setTimeout(() => {
      const cellRef = cellRefs.current.get(newlyAddedCellId);
      if (cellRef) {
        cellRef.scrollIntoView();
        cellRef.focus();
        onCellFocused?.();
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [newlyAddedCellId, onCellFocused]);

  const setCellRef = (cellId: string) => (ref: SQLCellRef | MarkdownCellRef | null) => {
    if (ref) {
      cellRefs.current.set(cellId, ref);
    } else {
      cellRefs.current.delete(cellId);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 w-full">
      {cells.map((cell) =>
        cell.type === 'markdown' ? (
          <MarkdownCell
            ref={setCellRef(cell.id)}
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
            ref={setCellRef(cell.id)}
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
