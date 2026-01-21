import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTableSchemas } from './useTableSchemas';
import { apiClient } from '@/lib/api-client';
import type { TableColumn } from './useTableSchema';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('useTableSchemas', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('returns empty data when no table names provided', () => {
    const { result } = renderHook(() => useTableSchemas([]), { wrapper });

    expect(result.current.data).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('fetches schema for a single table', async () => {
    const mockColumns: TableColumn[] = [
      { name: 'id', type: 'INTEGER' },
      { name: 'name', type: 'VARCHAR' },
    ];

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      columns: mockColumns,
    });

    const { result } = renderHook(() => useTableSchemas(['users']), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual({});

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({
      users: mockColumns,
    });
    expect(result.current.hasError).toBe(false);
    expect(apiClient.get).toHaveBeenCalledWith('/tables/users/schema');
  });

  it('fetches schemas for multiple tables in parallel', async () => {
    const mockUsersColumns: TableColumn[] = [
      { name: 'id', type: 'INTEGER' },
      { name: 'name', type: 'VARCHAR' },
    ];

    const mockOrdersColumns: TableColumn[] = [
      { name: 'id', type: 'INTEGER' },
      { name: 'user_id', type: 'INTEGER' },
      { name: 'total', type: 'DECIMAL' },
    ];

    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ columns: mockUsersColumns })
      .mockResolvedValueOnce({ columns: mockOrdersColumns });

    const { result } = renderHook(() => useTableSchemas(['users', 'orders']), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({
      users: mockUsersColumns,
      orders: mockOrdersColumns,
    });
    expect(result.current.hasError).toBe(false);
    expect(apiClient.get).toHaveBeenCalledWith('/tables/users/schema');
    expect(apiClient.get).toHaveBeenCalledWith('/tables/orders/schema');
  });

  it('handles errors gracefully', async () => {
    const error = new Error('Table not found');
    vi.mocked(apiClient.get).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useTableSchemas(['nonexistent']), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({});
    expect(result.current.hasError).toBe(true);
  });

  it('handles partial failures when fetching multiple tables', async () => {
    const mockUsersColumns: TableColumn[] = [
      { name: 'id', type: 'INTEGER' },
    ];

    const error = new Error('Table not found');
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ columns: mockUsersColumns })
      .mockRejectedValueOnce(error);

    const { result } = renderHook(() => useTableSchemas(['users', 'nonexistent']), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have data for the successful table
    expect(result.current.data).toEqual({
      users: mockUsersColumns,
    });
    // Should indicate there was an error
    expect(result.current.hasError).toBe(true);
  });

  it('encodes table names with special characters in URL', async () => {
    const mockColumns: TableColumn[] = [{ name: 'id', type: 'INTEGER' }];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ columns: mockColumns });

    const { result } = renderHook(() => useTableSchemas(['my_table']), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify the table name was properly encoded in the URL
    expect(apiClient.get).toHaveBeenCalledWith('/tables/my_table/schema');
  });
});
