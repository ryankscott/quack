import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = '/api';

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  referencedTables: string[];
  warnings?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateQueryRequest {
  name: string;
  sql: string;
}

export interface UpdateQueryRequest {
  name?: string;
  sql?: string;
}

/**
 * Fetch all saved queries
 */
export function useQueries() {
  return useQuery({
    queryKey: ['queries'],
    queryFn: async (): Promise<SavedQuery[]> => {
      const response = await fetch(`${API_BASE_URL}/queries`);
      if (!response.ok) {
        throw new Error(`Failed to fetch queries: ${response.statusText}`);
      }
      const data = await response.json();
      return data.queries;
    },
  });
}

/**
 * Fetch a single saved query by ID
 */
export function useSavedQuery(id: string | null) {
  return useQuery({
    queryKey: ['queries', id],
    queryFn: async (): Promise<SavedQuery> => {
      if (!id) throw new Error('Query ID is required');
      const response = await fetch(`${API_BASE_URL}/queries/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch query: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!id,
  });
}

/**
 * Create a new saved query
 */
export function useCreateQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateQueryRequest): Promise<SavedQuery> => {
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create query');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queries'] });
    },
  });
}

/**
 * Update an existing saved query
 */
export function useUpdateQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      request,
    }: {
      id: string;
      request: UpdateQueryRequest;
    }): Promise<SavedQuery> => {
      const response = await fetch(`${API_BASE_URL}/queries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update query');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['queries'] });
      queryClient.invalidateQueries({ queryKey: ['queries', variables.id] });
    },
  });
}

/**
 * Delete a saved query
 */
export function useDeleteQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/queries/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete query');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queries'] });
    },
  });
}
