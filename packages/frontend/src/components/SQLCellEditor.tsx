import { useRef, forwardRef, useImperativeHandle } from 'react';
import { SQLEditor, type SQLEditorRef } from './SQLEditor';
import { TemplatePicker } from './TemplatePicker';
import { Button } from './ui/button';
import { Eye, EyeOff, PanelRightClose, PanelRightOpen, Wand2 } from 'lucide-react';
import { CollapsibleContent } from './ui/collapsible';
import { SchemaPanel } from './SchemaPanel';
import type { SQLTemplate } from '@/lib/sql-templates';
import type { TableColumn } from '@/hooks/useTableSchema';
import { formatSql } from '@/lib/format-sql';

export interface SQLCellEditorRef {
  focus: () => void;
}

interface SQLCellEditorProps {
  sql: string;
  tableNames: string[];
  columnsByTable?: Record<string, TableColumn[]>;
  selectedTables?: string[];
  isSchemasLoading?: boolean;
  isExecuting: boolean;
  isCollapsed?: boolean;
  isSchemaCollapsed?: boolean;
  onSqlChange: (sql: string) => void;
  onExecute: () => void;
  onToggleCollapse?: () => void;
  onToggleSchema?: () => void;
}

/**
 * Editor section of SQL cell with SQL editor and execute button
 */
export const SQLCellEditor = forwardRef<SQLCellEditorRef, SQLCellEditorProps>(
  function SQLCellEditor(
    {
      sql,
      tableNames,
      columnsByTable,
      selectedTables = [],
      isSchemasLoading = false,
      isExecuting,
      isCollapsed,
      isSchemaCollapsed = false,
      onSqlChange,
      onExecute,
      onToggleCollapse,
      onToggleSchema,
    },
    ref
  ) {
    const editorRef = useRef<SQLEditorRef>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        editorRef.current?.focus();
      },
    }));

    const handleTemplateSelect = (template: SQLTemplate) => {
      editorRef.current?.insertSnippet(template.template);
      // Focus the editor after a short delay to allow the dropdown to fully close
      setTimeout(() => {
        editorRef.current?.focus();
      }, 50);
    };

    const handleColumnClick = (tableName: string, columnName: string) => {
      // Insert column name at cursor position
      const columnRef = `${tableName}.${columnName}`;
      editorRef.current?.insertText(columnRef);
      editorRef.current?.focus();
    };

    const handleFormatSql = () => {
      const formatted = formatSql(sql);
      if (!formatted) return;
      onSqlChange(formatted);
      setTimeout(() => editorRef.current?.focus(), 0);
    };

    return (
      <>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase text-quack-dark text-opacity-60 font-semibold">
            Editor
          </div>
          <div className="flex items-center gap-2">
            <TemplatePicker onSelect={handleTemplateSelect} />
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={handleFormatSql}
              disabled={!sql.trim()}
              title="Format SQL"
            >
              <Wand2 size={14} />
              <span className="ml-1 text-xs">Format SQL</span>
            </Button>
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
          <div className="flex">
            <div className="flex-1 border border-quack-dark border-opacity-20 rounded overflow-hidden">
              <SQLEditor
                ref={editorRef}
                value={sql}
                onChange={onSqlChange}
                onExecute={onExecute}
                height="200px"
                tableNames={tableNames}
                columnsByTable={columnsByTable}
              />
            </div>
            {onToggleSchema && (
              <div className="flex shrink-0 items-start px-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={onToggleSchema}
                  title={isSchemaCollapsed ? 'Show schema' : 'Hide schema'}
                >
                  {isSchemaCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
                </Button>
              </div>
            )}
            {!isSchemaCollapsed && (
              <SchemaPanel
                columnsByTable={columnsByTable || {}}
                selectedTables={selectedTables}
                isLoading={isSchemasLoading}
                onColumnClick={handleColumnClick}
              />
            )}
          </div>
        </CollapsibleContent>
      </>
    );
  }
);
