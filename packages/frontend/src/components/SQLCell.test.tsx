import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { SQLCell } from './SQLCell';
import type { CellState } from '@/hooks/useCellManager';

describe('SQLCell', () => {
  it('renders editor', () => {
    const mockCell: CellState = {
      id: 'test-cell',
      type: 'sql',
      sql: '',
      markdown: '',
      queryName: '',
      isExecuting: false,
      isDirty: false,
    };

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SQLCell
          cell={mockCell}
          cellIndex={0}
          totalCells={1}
          onUpdate={vi.fn()}
          onRemove={vi.fn()}
        />
      </QueryClientProvider>
    );
    expect(container).toBeTruthy();
  });

  it('allows hiding both editor and results with toggle buttons remaining visible', () => {
    const onUpdate = vi.fn();
    
    const mockCell: CellState = {
      id: 'test-cell',
      type: 'sql',
      sql: 'SELECT * FROM test',
      markdown: '',
      queryName: '',
      isExecuting: false,
      isDirty: false,
      result: {
        columns: [{ name: 'id', type: 'INTEGER' }],
        rows: [[1]],
        rowCount: 1,
        truncated: false,
      },
      isEditorCollapsed: false,
      isPreviewCollapsed: false,
    };

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <SQLCell
          cell={mockCell}
          cellIndex={0}
          totalCells={1}
          onUpdate={onUpdate}
          onRemove={vi.fn()}
        />
      </QueryClientProvider>
    );

    // Find and click the editor hide button
    const editorHideButton = screen.getByTitle('Hide editor');
    fireEvent.click(editorHideButton);

    // Verify editor was collapsed
    expect(onUpdate).toHaveBeenCalledWith({ isEditorCollapsed: true });
    onUpdate.mockClear();

    // Re-render with editor collapsed
    rerender(
      <QueryClientProvider client={queryClient}>
        <SQLCell
          cell={{ ...mockCell, isEditorCollapsed: true }}
          cellIndex={0}
          totalCells={1}
          onUpdate={onUpdate}
          onRemove={vi.fn()}
        />
      </QueryClientProvider>
    );

    // Now hide results - this should work since toggle buttons remain visible
    const resultsHideButton = screen.getByTitle('Hide results');
    fireEvent.click(resultsHideButton);

    // Verify results were collapsed
    expect(onUpdate).toHaveBeenCalledWith({ isPreviewCollapsed: true });
    
    // Re-render with both collapsed to verify toggle buttons remain visible
    rerender(
      <QueryClientProvider client={queryClient}>
        <SQLCell
          cell={{ ...mockCell, isEditorCollapsed: true, isPreviewCollapsed: true }}
          cellIndex={0}
          totalCells={1}
          onUpdate={vi.fn()}
          onRemove={vi.fn()}
        />
      </QueryClientProvider>
    );
    
    // Verify both toggle buttons are still accessible even when both are hidden
    expect(screen.getByTitle('Show editor')).toBeTruthy();
    expect(screen.getByTitle('Show results')).toBeTruthy();
  });

  it('allows hiding editor when results are visible', () => {
    const onUpdate = vi.fn();
    
    const mockCell: CellState = {
      id: 'test-cell',
      type: 'sql',
      sql: 'SELECT * FROM test',
      markdown: '',
      queryName: '',
      isExecuting: false,
      isDirty: false,
      result: {
        columns: [{ name: 'id', type: 'INTEGER' }],
        rows: [[1]],
        rowCount: 1,
        truncated: false,
      },
      isEditorCollapsed: false,
      isPreviewCollapsed: false,
    };

    render(
      <QueryClientProvider client={queryClient}>
        <SQLCell
          cell={mockCell}
          cellIndex={0}
          totalCells={1}
          onUpdate={onUpdate}
          onRemove={vi.fn()}
        />
      </QueryClientProvider>
    );

    // Hide editor when results are visible - this should work
    const editorHideButton = screen.getByTitle('Hide editor');
    fireEvent.click(editorHideButton);

    expect(onUpdate).toHaveBeenCalledWith({ isEditorCollapsed: true });
  });

  it('allows hiding results when editor is visible', () => {
    const onUpdate = vi.fn();
    
    const mockCell: CellState = {
      id: 'test-cell',
      type: 'sql',
      sql: 'SELECT * FROM test',
      markdown: '',
      queryName: '',
      isExecuting: false,
      isDirty: false,
      result: {
        columns: [{ name: 'id', type: 'INTEGER' }],
        rows: [[1]],
        rowCount: 1,
        truncated: false,
      },
      isEditorCollapsed: false,
      isPreviewCollapsed: false,
    };

    render(
      <QueryClientProvider client={queryClient}>
        <SQLCell
          cell={mockCell}
          cellIndex={0}
          totalCells={1}
          onUpdate={onUpdate}
          onRemove={vi.fn()}
        />
      </QueryClientProvider>
    );

    // Hide results when editor is visible - this should work
    const resultsHideButton = screen.getByTitle('Hide results');
    fireEvent.click(resultsHideButton);

    expect(onUpdate).toHaveBeenCalledWith({ isPreviewCollapsed: true });
  });
});
