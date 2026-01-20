import { useTables } from '@/hooks/useTables';
import { X, Database, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface TableSelectorProps {
  selectedTables: string[];
  onTablesChange: (tables: string[]) => void;
}

/**
 * Component for selecting multiple tables for a SQL cell
 */
export function TableSelector({ selectedTables, onTablesChange }: TableSelectorProps) {
  const { data: tables, isLoading } = useTables();

  const availableTables = tables || [];
  const unselectedTables = availableTables.filter(
    (table) => !selectedTables.includes(table.name)
  );

  const handleAddTable = (tableName: string) => {
    if (!selectedTables.includes(tableName)) {
      onTablesChange([...selectedTables, tableName]);
    }
  };

  const handleRemoveTable = (tableName: string) => {
    onTablesChange(selectedTables.filter((t) => t !== tableName));
  };

  if (isLoading) {
    return (
      <div className="text-xs text-quack-dark text-opacity-60 px-2">Loading tables...</div>
    );
  }

  if (availableTables.length === 0) {
    return (
      <div className="text-xs text-quack-dark text-opacity-60 px-2">
        No tables available
      </div>
    );
  }

  return (
    <div className="flex flex-row items-center gap-2 flex-wrap">
      {selectedTables.length === 0 && (
        <div className="text-xs text-quack-dark text-opacity-60 px-2">
          No tables selected
        </div>
      )}

      {selectedTables.map((tableName) => (
        <div
          key={tableName}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-quack-gold bg-opacity-20 border border-quack-orange border-opacity-30 text-xs"
        >
          <Database size={12} className="text-quack-orange" />
          <span className="text-quack-dark font-mono">{tableName}</span>
          <button
            onClick={() => handleRemoveTable(tableName)}
            className="ml-1 hover:text-red-600 transition-colors"
            aria-label={`Remove ${tableName}`}
          >
            <X size={12} />
          </button>
        </div>
      ))}

      {unselectedTables.length > 0 && (
        <Select value="" onValueChange={handleAddTable}>
          <SelectTrigger className="h-6 w-auto px-2 text-xs border-quack-dark border-opacity-20 gap-1">
            <Plus size={12} />
            <SelectValue placeholder="Add table" />
          </SelectTrigger>
          <SelectContent>
            {unselectedTables.map((table) => (
              <SelectItem
                key={table.id}
                value={table.name}
              >
                <span className="flex items-center gap-2">
                  <Database size={12} className="text-quack-orange" />
                  {table.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {unselectedTables.length === 0 && selectedTables.length > 0 && (
        <div className="text-xs text-quack-dark text-opacity-40 px-2">
          All tables selected
        </div>
      )}
    </div>
  );
}
