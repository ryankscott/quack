import { useState, useCallback } from 'react';
import type { QueryResult } from './useQuery';
import type { ChartConfig } from '@/lib/chart-config';

export interface CellState {
  id: string;
  type: 'sql' | 'markdown';
  sql: string;
  markdown: string;
  result?: QueryResult;
  error?: string;
  isExecuting: boolean;
  chartConfig?: ChartConfig;
  chartImageUrl?: string;
  isEditorCollapsed?: boolean;
  isPreviewCollapsed?: boolean;
  selectedTables?: string[];
  /** Display mode for results: 'table' or 'chart'. Defaults to 'table'. */
  displayMode?: 'table' | 'chart';
}

export function useCellManager(initialCells: CellState[] = []) {
  const [cells, setCells] = useState<CellState[]>(
    initialCells.length > 0 ? initialCells : [createNewCell()]
  );
  const [newlyAddedCellId, setNewlyAddedCellId] = useState<string | null>(null);

  function createNewCell(type: 'sql' | 'markdown' = 'sql'): CellState {
    return {
      id: generateId(),
      type,
      sql: '',
      markdown: '',
      isExecuting: false,
    };
  }

  const addCell = useCallback((type: 'sql' | 'markdown' = 'sql', position?: number) => {
    const newCell = createNewCell(type);
    setCells((prev) => {
      if (position !== undefined && position >= 0 && position <= prev.length) {
        return [...prev.slice(0, position), newCell, ...prev.slice(position)];
      }
      return [...prev, newCell];
    });
    setNewlyAddedCellId(newCell.id);
    return newCell.id;
  }, []);

  const clearNewlyAddedCellId = useCallback(() => {
    setNewlyAddedCellId(null);
  }, []);

  const removeCell = useCallback((cellId: string) => {
    setCells((prev) => {
      const filtered = prev.filter((cell) => cell.id !== cellId);
      // Always keep at least one cell
      return filtered.length === 0 ? [createNewCell()] : filtered;
    });
  }, []);

  const updateCell = useCallback((cellId: string, updates: Partial<CellState>) => {
    setCells((prev) => prev.map((cell) => (cell.id === cellId ? { ...cell, ...updates } : cell)));
  }, []);

  const moveCellUp = useCallback((cellId: string) => {
    setCells((prev) => {
      const index = prev.findIndex((cell) => cell.id === cellId);
      if (index <= 0) return prev;

      const newCells = [...prev];
      const current = newCells[index];
      const previous = newCells[index - 1];
      if (current && previous) {
        newCells[index - 1] = current;
        newCells[index] = previous;
      }
      return newCells;
    });
  }, []);

  const moveCellDown = useCallback((cellId: string) => {
    setCells((prev) => {
      const index = prev.findIndex((cell) => cell.id === cellId);
      if (index === -1 || index >= prev.length - 1) return prev;

      const newCells = [...prev];
      const current = newCells[index];
      const next = newCells[index + 1];
      if (current && next) {
        newCells[index] = next;
        newCells[index + 1] = current;
      }
      return newCells;
    });
  }, []);

  const getCellIndex = useCallback((cellId: string): number => {
    return cells.findIndex((cell) => cell.id === cellId);
  }, [cells]);

  const setCellsDirectly = useCallback((newCells: CellState[]) => {
    setCells(newCells.length > 0 ? newCells : [createNewCell()]);
  }, []);

  return {
    cells,
    addCell,
    removeCell,
    updateCell,
    moveCellUp,
    moveCellDown,
    getCellIndex,
    setCellsDirectly,
    newlyAddedCellId,
    clearNewlyAddedCellId,
  };
}

function generateId(): string {
  return `cell-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
