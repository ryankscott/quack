import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { editor, Range } from 'monaco-editor';
import type * as Monaco from 'monaco-editor';
import type { TableColumn } from '@/hooks/useTableSchema';

export interface SQLEditorRef {
  insertSnippet: (snippetText: string) => void;
  insertText: (text: string) => void;
  focus: () => void;
}

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  readOnly?: boolean;
  height?: string;
  tableNames?: string[];
  columnsByTable?: Record<string, TableColumn[]>;
}

export const SQLEditor = forwardRef<SQLEditorRef, SQLEditorProps>(function SQLEditor(
  {
    value,
    onChange,
    onExecute,
    readOnly = false,
    height = '200px',
    tableNames = [],
    columnsByTable = {},
  },
  ref
) {
  const internalEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const tableNamesRef = useRef<string[]>(tableNames);
  const columnsByTableRef = useRef<Record<string, TableColumn[]>>(columnsByTable);
  const onExecuteRef = useRef(onExecute);

  // Update refs when props change so completion provider always has latest values
  useEffect(() => {
    tableNamesRef.current = tableNames;
  }, [tableNames]);

  useEffect(() => {
    columnsByTableRef.current = columnsByTable;
  }, [columnsByTable]);

  useEffect(() => {
    onExecuteRef.current = onExecute;
  }, [onExecute]);

  const handleEditorChange = (newValue: string | undefined) => {
    onChange(newValue || '');
  };

  useImperativeHandle(ref, () => ({
    insertSnippet: (snippetText: string) => {
      const editorInstance = internalEditorRef.current;
      if (!editorInstance) return;

      const selection = editorInstance.getSelection();
      if (!selection) return;

      // Use Monaco's snippet controller to insert with tab stops
      const contribution = editorInstance.getContribution('snippetController2');
      if (contribution && typeof (contribution as any).insert === 'function') {
        // Insert snippet at current selection
        (contribution as any).insert(
          snippetText,
          selection.startLineNumber,
          selection.startColumn,
          selection.endLineNumber,
          selection.endColumn
        );
      } else {
        // Fallback: insert as regular text if snippet controller not available
        const range = new Range(
          selection.startLineNumber,
          selection.startColumn,
          selection.endLineNumber,
          selection.endColumn
        );
        const id = { major: 1, minor: 1 };
        const op = {
          identifier: id,
          range: range,
          text: snippetText,
          forceMoveMarkers: true,
        };
        editorInstance.executeEdits('template-insert', [op]);
      }
    },
    insertText: (text: string) => {
      const editorInstance = internalEditorRef.current;
      if (!editorInstance) return;

      const selection = editorInstance.getSelection();
      if (!selection) return;

      // Insert text at current cursor position
      const range = new Range(
        selection.startLineNumber,
        selection.startColumn,
        selection.endLineNumber,
        selection.endColumn
      );
      const id = { major: 1, minor: 1 };
      const op = {
        identifier: id,
        range: range,
        text: text,
        forceMoveMarkers: true,
      };
      editorInstance.executeEdits('column-insert', [op]);

      // Move cursor to end of inserted text
      const newPosition = {
        lineNumber: selection.startLineNumber,
        column: selection.startColumn + text.length,
      };
      editorInstance.setPosition(newPosition);
    },
    focus: () => {
      internalEditorRef.current?.focus();
    },
  }));

  const handleEditorMount = (editor: editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    internalEditorRef.current = editor;

    // Add keyboard event listener for Cmd+Enter / Ctrl+Enter
    editor.onKeyDown((e) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      if (e.keyCode === monaco.KeyCode.Enter && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();

        // Use ref to get the latest onExecute callback
        const currentOnExecute = onExecuteRef.current;
        if (currentOnExecute) {
          currentOnExecute();
        }
      }
    });

    // Register autocomplete provider for table names and columns
    const disposable = monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: ['.'],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const suggestions: Monaco.languages.CompletionItem[] = [];

        // Use refs to get latest values
        const currentTableNames = tableNamesRef.current;
        const currentColumnsByTable = columnsByTableRef.current;

        // Check if we're typing after a dot (table.column context)
        const dotMatch = textUntilPosition.match(/(\w+)\.\s*$/);
        if (dotMatch) {
          // We're after a dot, suggest columns from that specific table
          const tableName = dotMatch[1]!;
          const columns = currentColumnsByTable[tableName] || [];
          columns.forEach((column) => {
            suggestions.push({
              label: column.name,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: `Column (${column.type})`,
              insertText: column.name,
              range: range,
            });
          });
        } else {
          // Not after a dot, suggest both tables and columns

          // Add table name suggestions
          currentTableNames.forEach((tableName) => {
            suggestions.push({
              label: tableName,
              kind: monaco.languages.CompletionItemKind.Class,
              detail: 'Table',
              insertText: tableName,
              range: range,
            });
          });

          // Add column suggestions from all tables
          Object.entries(currentColumnsByTable).forEach(([tableName, columns]) => {
            columns.forEach((column) => {
              // Suggest both bare column name and table.column format
              suggestions.push({
                label: column.name,
                kind: monaco.languages.CompletionItemKind.Field,
                detail: `Column from ${tableName} (${column.type})`,
                insertText: column.name,
                range: range,
              });
              suggestions.push({
                label: `${tableName}.${column.name}`,
                kind: monaco.languages.CompletionItemKind.Field,
                detail: `Column (${column.type})`,
                insertText: `${tableName}.${column.name}`,
                range: range,
              });
            });
          });
        }

        return { suggestions };
      },
    });

    // Clean up on unmount
    editor.onDidDispose(() => {
      disposable.dispose();
    });
  };

  return (
    <Editor
      height={height}
      defaultLanguage="sql"
      value={value}
      onChange={handleEditorChange}
      onMount={handleEditorMount}
      theme="vs"
      options={{
        minimap: { enabled: false },
        fontSize: 12,
        lineNumbers: 'on',
        readOnly,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
      }}
    />
  );
});
