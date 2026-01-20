import { forwardRef, useImperativeHandle, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { editor, Range } from 'monaco-editor';
import type * as Monaco from 'monaco-editor';

export interface SQLEditorRef {
  insertSnippet: (snippetText: string) => void;
  focus: () => void;
}

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  readOnly?: boolean;
  height?: string;
  tableNames?: string[];
}

export const SQLEditor = forwardRef<SQLEditorRef, SQLEditorProps>(function SQLEditor(
  {
    value,
    onChange,
    onExecute,
    readOnly = false,
    height = '200px',
    tableNames = [],
  },
  ref
) {
  const internalEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

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
    focus: () => {
      internalEditorRef.current?.focus();
    },
  }));

  const handleEditorMount = (editor: editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    internalEditorRef.current = editor;
    // Add Cmd+Enter / Ctrl+Enter shortcut for execution
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        onExecute?.();
      }
    );

    // Register autocomplete provider for table names
    if (tableNames.length > 0) {
      const disposable = monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions = tableNames.map((tableName) => ({
            label: tableName,
            kind: monaco.languages.CompletionItemKind.Class,
            detail: 'Table',
            insertText: tableName,
            range: range,
          }));

          return { suggestions };
        },
      });

      // Clean up on unmount
      editor.onDidDispose(() => {
        disposable.dispose();
      });
    }
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
        fontSize: 14,
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
