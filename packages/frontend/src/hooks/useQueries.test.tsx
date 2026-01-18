import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQueries, useCreateQuery, useUpdateQuery, useDeleteQuery } from './useQueries';
import type { ReactNode } from 'react';

// Mock fetch
global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches saved queries', async () => {
    const mockQueries = [
      {
        id: '1',
        name: 'Test Query',
        sql: 'SELECT * FROM test',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ queries: mockQueries }),
    });

    const { result } = renderHook(() => useQueries(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockQueries);
    expect(global.fetch).toHaveBeenCalledWith('/api/queries');
  });

  it('creates a new query', async () => {
    const newQuery = {
      id: '1',
      name: 'New Query',
      sql: 'SELECT 1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => newQuery,
    });

    const { result } = renderHook(() => useCreateQuery(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      name: 'New Query',
      sql: 'SELECT 1',
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/queries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Query', sql: 'SELECT 1' }),
    });
  });

  it('updates an existing query', async () => {
    const updatedQuery = {
      id: '1',
      name: 'Updated Query',
      sql: 'SELECT 2',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedQuery,
    });

    const { result } = renderHook(() => useUpdateQuery(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: '1',
      request: { name: 'Updated Query', sql: 'SELECT 2' },
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/queries/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Query', sql: 'SELECT 2' }),
    });
  });

  it('deletes a query', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useDeleteQuery(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('1');

    expect(global.fetch).toHaveBeenCalledWith('/api/queries/1', {
      method: 'DELETE',
    });
  });
});
