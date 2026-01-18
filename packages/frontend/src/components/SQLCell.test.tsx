import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
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
});
