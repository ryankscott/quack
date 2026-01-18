import { useTables } from '@/hooks/useTables';
import { LoadingState, ErrorState } from './ui/loading-error';

interface TableListProps {
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
}

export function TableList({ selectedTable, onSelectTable }: TableListProps) {
  const { data: tables, isLoading, error } = useTables();

  if (isLoading) {
    return <LoadingState message="Loading tables..." />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!tables || tables.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm text-quack-dark text-opacity-60">No tables created yet</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-quack-dark mb-3">Tables</h3>
      <div className="space-y-1">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => onSelectTable(table.name)}
            className={`
              w-full text-left p-3 rounded border transition-colors
              ${
                selectedTable === table.name
                  ? 'bg-quack-gold_bg border-quack-orange text-quack-dark'
                  : 'bg-quack-gold bg-opacity-5 border-quack-dark border-opacity-10 hover:bg-opacity-10'
              }
            `}
          >
            <div className="text-sm font-medium truncate">{table.name}</div>
            <div className="text-xs text-quack-dark text-opacity-60">
              {new Date(table.created_at).toLocaleString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
