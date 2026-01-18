import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

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
      const data = await apiClient.get<{ queries: SavedQuery[] }>('/queries');
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
      return apiClient.get<SavedQuery>(`/queries/${id}`);
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
      return apiClient.post<SavedQuery>('/queries', request);
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
      return apiClient.put<SavedQuery>(`/queries/${id}`, request);
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
      await apiClient.delete<void>(`/queries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queries'] });
    },
  });
}
