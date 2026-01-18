import { SQLEditor } from './SQLEditor';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface SQLCellEditorProps {
  sql: string;
  queryName: string;
  tableNames: string[];
  isExecuting: boolean;
  isSaving: boolean;
  savedQueryId?: string;
  onSqlChange: (sql: string) => void;
  onQueryNameChange: (name: string) => void;
  onExecute: () => void;
  onSave: () => void;
}

/**
 * Editor section of SQL cell with query name input, SQL editor, and action buttons
 */
export function SQLCellEditor({
  sql,
  queryName,
  tableNames,
  isExecuting,
  isSaving,
  savedQueryId,
  onSqlChange,
  onQueryNameChange,
  onExecute,
  onSave,
}: SQLCellEditorProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 flex-1">
          <Input
            type="text"
            value={queryName}
            onChange={(e) => onQueryNameChange(e.target.value)}
            placeholder="Query name..."
            className="text-sm font-semibold"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onSave}
            disabled={!sql.trim() || !queryName.trim() || isSaving}
            variant="outline"
            size="sm"
          >
            {isSaving ? 'Saving...' : savedQueryId ? 'Update' : 'Save'}
          </Button>
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
