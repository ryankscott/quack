import { SQLEditor } from './SQLEditor';
import { Button } from './ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface SQLCellEditorProps {
  sql: string;
  tableNames: string[];
  isExecuting: boolean;
  isCollapsed?: boolean;
  onSqlChange: (sql: string) => void;
  onExecute: () => void;
  onToggleCollapse?: () => void;
}

/**
 * Editor section of SQL cell with SQL editor and execute button
 */
export function SQLCellEditor({
  sql,
  tableNames,
  isExecuting,
  isCollapsed,
  onSqlChange,
  onExecute,
  onToggleCollapse,
}: SQLCellEditorProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase text-quack-dark text-opacity-60 font-semibold">
          Editor
        </div>
        <div className="flex items-center gap-2">
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Show editor' : 'Hide editor'}
            >
              {isCollapsed ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className="ml-1 text-xs">{isCollapsed ? 'Show' : 'Hide'}</span>
            </Button>
          )}
          <Button onClick={onExecute} disabled={!sql.trim() || isExecuting} size="sm">
            {isExecuting ? (
              <>
                <span className="animate-spin">⟳</span>
                Running...
              </>
            ) : (
              <>
                <span>▶</span>
                Run (⌘↵)
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="border border-quack-dark border-opacity-20 rounded overflow-hidden">
        <SQLEditor
          value={sql}
          onChange={onSqlChange}
          onExecute={onExecute}
          height="200px"
          tableNames={tableNames}
        />
      </div>
    </div>
  );
}
