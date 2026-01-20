import { useRef } from 'react';
import { SQLEditor, type SQLEditorRef } from './SQLEditor';
import { TemplatePicker } from './TemplatePicker';
import { Button } from './ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { CollapsibleContent } from './ui/collapsible';
import type { SQLTemplate } from '@/lib/sql-templates';

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
  const editorRef = useRef<SQLEditorRef>(null);

  const handleTemplateSelect = (template: SQLTemplate) => {
    editorRef.current?.insertSnippet(template.template);
    // Focus the editor after a short delay to allow the dropdown to fully close
    setTimeout(() => {
      editorRef.current?.focus();
    }, 50);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase text-quack-dark text-opacity-60 font-semibold">
          Editor
        </div>
        <div className="flex items-center gap-2">
          <TemplatePicker onSelect={handleTemplateSelect} />
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
      <CollapsibleContent>
        <div className="border border-quack-dark border-opacity-20 rounded overflow-hidden">
          <SQLEditor
            ref={editorRef}
            value={sql}
            onChange={onSqlChange}
            onExecute={onExecute}
            height="200px"
            tableNames={tableNames}
          />
        </div>
      </CollapsibleContent>
    </>
  );
}
