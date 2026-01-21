import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import type { TableColumn } from '@/hooks/useTableSchema';

interface SchemaPanelProps {
  columnsByTable: Record<string, TableColumn[]>;
  selectedTables: string[];
  isLoading?: boolean;
  onColumnClick?: (tableName: string, columnName: string) => void;
}

/**
 * Schema panel that displays table columns and types in a tabbed interface.
 * Clicking on a column name triggers onColumnClick callback.
 */
export function SchemaPanel({
  columnsByTable,
  selectedTables,
  isLoading,
  onColumnClick,
}: SchemaPanelProps) {
  // Don't render if no tables selected
  if (selectedTables.length === 0) {
    return (
      <div className="w-64 border-l border-quack-dark border-opacity-10 p-4 text-sm text-quack-dark text-opacity-40 flex items-center justify-center">
        Select a table to view schema
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-64 border-l border-quack-dark border-opacity-10 p-4">
        <div className="text-xs uppercase text-quack-dark text-opacity-60 font-semibold mb-3">
          Schema
        </div>
        <div className="text-sm text-quack-dark text-opacity-40">Loading schema...</div>
      </div>
    );
  }

  // Single table - simple list
  if (selectedTables.length === 1) {
    const tableName = selectedTables[0]!;
    const columns = columnsByTable[tableName] || [];

    return (
      <div className="w-64 border-l border-quack-dark border-opacity-10 p-4">
        <div className="text-xs uppercase text-quack-dark text-opacity-60 font-semibold mb-3">
          {tableName}
        </div>
        <ScrollArea className="h-[calc(200px-2rem)]">
          <div className="space-y-1">
            {columns.length === 0 ? (
              <div className="text-sm text-quack-dark text-opacity-40">No columns found</div>
            ) : (
              columns.map((column) => (
                <button
                  key={column.name}
                  onClick={() => onColumnClick?.(tableName, column.name)}
                  className="w-full text-left p-1 rounded hover:bg-quack-dark hover:bg-opacity-5 transition-colors group"
                  title="Click to insert column"
                >
                  <div className="flex row items-center gap-1 justify-start">
                    <Badge
                      variant="secondary"
                      className="text-xs p-1 font-normal bg-quack-dark bg-opacity-5 text-quack-dark text-opacity-60 "
                    >
                      {column.type}
                    </Badge>
                    <span className="text-xs font-mono text-quack-dark group-hover:text-quack-primary transition-colors">
                      {column.name}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Multiple tables - use tabs
  return (
    <div className="w-64 border-l border-quack-dark border-opacity-10">
      <Tabs defaultValue={selectedTables[0]} className="h-full">
        <div className="border-b border-quack-dark border-opacity-10 px-4 pt-4 pb-2">
          <div className="text-xs uppercase text-quack-dark text-opacity-60 font-semibold mb-2">
            Schema
          </div>
          <TabsList className="w-full h-auto flex flex-wrap gap-1 bg-transparent p-0">
            {selectedTables.map((tableName) => (
              <TabsTrigger
                key={tableName}
                value={tableName}
                className="text-xs px-2 py-1 data-[state=active]:bg-quack-primary data-[state=active]:text-white"
              >
                {tableName}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {selectedTables.map((tableName) => {
          const columns = columnsByTable[tableName] || [];
          return (
            <TabsContent key={tableName} value={tableName} className="mt-0">
              <ScrollArea className="h-[calc(200px-5rem)] px-4">
                <div className="space-y-1 py-2">
                  {columns.length === 0 ? (
                    <div className="text-sm text-quack-dark text-opacity-40">No columns found</div>
                  ) : (
                    columns.map((column) => (
                      <button
                        key={column.name}
                        onClick={() => onColumnClick?.(tableName, column.name)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-quack-dark hover:bg-opacity-5 transition-colors group"
                        title="Click to insert column"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-mono text-quack-dark group-hover:text-quack-primary transition-colors">
                            {column.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-xs font-normal bg-quack-dark bg-opacity-5 text-quack-dark text-opacity-60 shrink-0"
                          >
                            {column.type}
                          </Badge>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
