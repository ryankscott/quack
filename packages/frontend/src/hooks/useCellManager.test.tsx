import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCellManager } from './useCellManager';

describe('useCellManager', () => {
  it('initializes with one empty cell', () => {
    const { result } = renderHook(() => useCellManager());

    expect(result.current.cells).toHaveLength(1);
    expect(result.current.cells[0]?.sql).toBe('');
  });

  it('adds a new cell', () => {
    const { result } = renderHook(() => useCellManager());

    act(() => {
      result.current.addCell();
    });

    expect(result.current.cells).toHaveLength(2);
  });

  it('removes a cell but keeps at least one', () => {
    const { result } = renderHook(() => useCellManager());

    const firstCellId = result.current.cells[0]?.id;
    expect(firstCellId).toBeDefined();

    // Remove the only cell - should keep one cell
    act(() => {
      result.current.removeCell(firstCellId!);
    });

    expect(result.current.cells).toHaveLength(1);
    // Should be a new cell, not the same one
    expect(result.current.cells[0]?.id).not.toBe(firstCellId);
  });

  it('removes a cell when multiple exist', () => {
    const { result } = renderHook(() => useCellManager());

    act(() => {
      result.current.addCell();
    });

    const firstCellId = result.current.cells[0]?.id;
    expect(firstCellId).toBeDefined();

    act(() => {
      result.current.removeCell(firstCellId!);
    });

    expect(result.current.cells).toHaveLength(1);
    expect(result.current.cells[0]?.id).not.toBe(firstCellId);
  });

  it('updates a cell', () => {
    const { result } = renderHook(() => useCellManager());

    const cellId = result.current.cells[0]?.id;
    expect(cellId).toBeDefined();

    act(() => {
      result.current.updateCell(cellId!, { sql: 'SELECT 1', isDirty: true });
    });

    expect(result.current.cells[0]?.sql).toBe('SELECT 1');
    expect(result.current.cells[0]?.isDirty).toBe(true);
  });

  it('moves a cell up', () => {
    const { result } = renderHook(() => useCellManager());

    act(() => {
      result.current.addCell();
    });

    const firstCellId = result.current.cells[0]?.id;
    const secondCellId = result.current.cells[1]?.id;
    expect(firstCellId).toBeDefined();
    expect(secondCellId).toBeDefined();

    act(() => {
      result.current.moveCellUp(secondCellId!);
    });

    expect(result.current.cells[0]?.id).toBe(secondCellId);
    expect(result.current.cells[1]?.id).toBe(firstCellId);
  });

  it('moves a cell down', () => {
    const { result } = renderHook(() => useCellManager());

    act(() => {
      result.current.addCell();
    });

    const firstCellId = result.current.cells[0]?.id;
    const secondCellId = result.current.cells[1]?.id;
    expect(firstCellId).toBeDefined();
    expect(secondCellId).toBeDefined();

    act(() => {
      result.current.moveCellDown(firstCellId!);
    });

    expect(result.current.cells[0]?.id).toBe(secondCellId);
    expect(result.current.cells[1]?.id).toBe(firstCellId);
  });

  it('does not move cell up when at the top', () => {
    const { result } = renderHook(() => useCellManager());

    act(() => {
      result.current.addCell();
    });

    const firstCellId = result.current.cells[0]?.id;
    expect(firstCellId).toBeDefined();

    act(() => {
      result.current.moveCellUp(firstCellId!);
    });

    // Order should remain unchanged
    expect(result.current.cells[0]?.id).toBe(firstCellId);
  });

  it('does not move cell down when at the bottom', () => {
    const { result } = renderHook(() => useCellManager());

    act(() => {
      result.current.addCell();
    });

    const secondCellId = result.current.cells[1]?.id;
    expect(secondCellId).toBeDefined();

    act(() => {
      result.current.moveCellDown(secondCellId!);
    });

    // Order should remain unchanged
    expect(result.current.cells[1]?.id).toBe(secondCellId);
  });

  it('returns correct cell index', () => {
    const { result } = renderHook(() => useCellManager());

    act(() => {
      result.current.addCell();
      result.current.addCell();
    });

    const secondCellId = result.current.cells[1]?.id;
    expect(secondCellId).toBeDefined();

    expect(result.current.getCellIndex(secondCellId!)).toBe(1);
  });

  it('tracks newly added cell ID', () => {
    const { result } = renderHook(() => useCellManager());

    // Initially no newly added cell
    expect(result.current.newlyAddedCellId).toBeNull();

    let newCellId: string;
    act(() => {
      newCellId = result.current.addCell();
    });

    // After adding a cell, newlyAddedCellId should be set
    expect(result.current.newlyAddedCellId).toBe(newCellId!);
    expect(result.current.cells).toHaveLength(2);
  });

  it('clears newly added cell ID', () => {
    const { result } = renderHook(() => useCellManager());

    act(() => {
      result.current.addCell();
    });

    expect(result.current.newlyAddedCellId).not.toBeNull();

    act(() => {
      result.current.clearNewlyAddedCellId();
    });

    expect(result.current.newlyAddedCellId).toBeNull();
  });
});
