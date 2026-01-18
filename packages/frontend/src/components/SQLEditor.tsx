import Editor from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import type * as Monaco from 'monaco-editor';

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  readOnly?: boolean;
  height?: string;
  tableNames?: string[];
}

export function SQLEditor({
  value,
  onChange,
  onExecute,
  readOnly = false,
  height = '200px',
  tableNames = [],
}: SQLEditorProps) {
  const handleEditorChange = (newValue: string | undefined) => {
    onChange(newValue || '');
  };

  const handleEditorMount = (editor: editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    // Add Cmd+Enter / Ctrl+Enter shortcut for execution
    editor.addCommand(
      (window.navigator.platform.match('Mac') ? 2048 : 2056) | 3, // Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.Enter
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
}
