import { SQLCell } from './SQLCell';
import { MarkdownCell } from './MarkdownCell';
import type { CellState } from '@/hooks/useCellManager';
import type { SavedQuery } from '@/hooks/useQueries';

interface WorkspaceCellListProps {
  cells: CellState[];
  selectedQuery?: SavedQuery;
  getCellIndex: (cellId: string) => number;
  onUpdateCell: (cellId: string, updates: Partial<CellState>) => void;
  onRemoveCell: (cellId: string) => void;
  onMoveCellUp: (cellId: string) => void;
  onMoveCellDown: (cellId: string) => void;
  onQuerySaved: (query: SavedQuery) => void;
}

/**
 * List of cells in the workspace
 */
export function WorkspaceCellList({
  cells,
  selectedQuery,
  getCellIndex,
  onUpdateCell,
  onRemoveCell,
  onMoveCellUp,
  onMoveCellDown,
  onQuerySaved,
}: WorkspaceCellListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
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
            initialQuery={selectedQuery}
            onQuerySaved={onQuerySaved}
          />
        )
      )}
    </div>
  );
}
