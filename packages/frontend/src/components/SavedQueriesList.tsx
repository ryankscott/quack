import { Trash2, Database, AlertCircle } from 'lucide-react';
import { useQueries, useDeleteQuery, type SavedQuery } from '../hooks/useQueries';

interface SavedQueriesListProps {
  onLoadQuery: (query: SavedQuery) => void;
}

export function SavedQueriesList({ onLoadQuery }: SavedQueriesListProps) {
  const { data: queries, isLoading, error } = useQueries();
  const deleteQueryMutation = useDeleteQuery();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this query?')) {
      await deleteQueryMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-quack-dark text-opacity-60">Loading queries...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Failed to load queries: {error.message}</div>;
  }

  if (!queries || queries.length === 0) {
    return (
      <div className="p-4 text-quack-dark text-opacity-60 text-sm">
        No saved queries yet. Save your first query to see it here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {queries.map((query) => (
        <div
          key={query.id}
          className="border border-quack-dark border-opacity-10 rounded-lg p-3 hover:bg-quack-gold hover:bg-opacity-5 cursor-pointer group"
          onClick={() => onLoadQuery(query)}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate text-quack-dark">{query.name}</h3>
              <p className="text-xs text-quack-dark text-opacity-60 mt-1 line-clamp-2">
                {query.sql}
              </p>

              {/* Referenced tables */}
              {query.referencedTables && query.referencedTables.length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  <Database size={12} className="text-quack-dark text-opacity-40" />
                  {query.referencedTables.map((table) => (
                    <span
                      key={table}
                      className="text-xs px-2 py-0.5 bg-quack-orange bg-opacity-10 text-quack-orange rounded"
                    >
                      {table}
                    </span>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {query.warnings && query.warnings.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <AlertCircle size={12} className="text-yellow-600" />
                  <span className="text-xs text-yellow-600">{query.warnings[0]}</span>
                </div>
              )}

              <p className="text-xs text-quack-dark text-opacity-40 mt-1">
                Updated {new Date(query.updated_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={(e) => handleDelete(query.id, e)}
              className="ml-2 text-quack-dark text-opacity-40 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete query"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
