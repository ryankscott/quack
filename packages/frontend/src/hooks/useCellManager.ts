import { useState } from 'react';
import type { QueryResult } from './useQuery';

export interface CellState {
  id: string;
  type: 'sql' | 'markdown';
  sql: string;
  markdown: string;
  queryName: string;
  savedQueryId?: string;
  result?: QueryResult;
  error?: string;
  isExecuting: boolean;
  isDirty: boolean;
}

export function useCellManager(initialCells: CellState[] = []) {
  const [cells, setCells] = useState<CellState[]>(
    initialCells.length > 0 ? initialCells : [createNewCell()]
  );

  function createNewCell(type: 'sql' | 'markdown' = 'sql'): CellState {
    return {
      id: generateId(),
      type,
      sql: '',
      markdown: '',
      queryName: '',
      isExecuting: false,
      isDirty: false,
    };
  }

  function addCell(type: 'sql' | 'markdown' = 'sql', position?: number) {
    const newCell = createNewCell(type);
    setCells((prev) => {
      if (position !== undefined && position >= 0 && position <= prev.length) {
        return [...prev.slice(0, position), newCell, ...prev.slice(position)];
      }
      return [...prev, newCell];
    });
    return newCell.id;
  }

  function removeCell(cellId: string) {
    setCells((prev) => {
      const filtered = prev.filter((cell) => cell.id !== cellId);
      // Always keep at least one cell
      return filtered.length === 0 ? [createNewCell()] : filtered;
    });
  }

  function updateCell(cellId: string, updates: Partial<CellState>) {
    setCells((prev) => prev.map((cell) => (cell.id === cellId ? { ...cell, ...updates } : cell)));
  }

  function moveCellUp(cellId: string) {
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
  }

  function moveCellDown(cellId: string) {
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
  }

  function getCellIndex(cellId: string): number {
    return cells.findIndex((cell) => cell.id === cellId);
  }

  return {
    cells,
    addCell,
    removeCell,
    updateCell,
    moveCellUp,
    moveCellDown,
    getCellIndex,
  };
}

function generateId(): string {
  return `cell-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
