import { useEffect, useMemo, useState } from 'react';
import { useFileSchema } from '@/hooks/useFiles';
import { useCreateTable, useTables } from '@/hooks/useTables';
import { useTableSchema } from '@/hooks/useTableSchema';
import {
  createInitialImportColumnConfigs,
  getImportColumnValidationError,
  projectImportPreview,
  toColumnMappings,
  type ImportColumnConfig,
} from '@/lib/import-mappings';
import { DataTable } from './ui/data-table';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

type ImportMode = 'create' | 'append';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  onSuccess?: (tableName: string) => void;
}

export function ImportDialog({ open, onOpenChange, fileId, onSuccess }: ImportDialogProps) {
  const [mode, setMode] = useState<ImportMode>('create');
  const [tableName, setTableName] = useState('');
  const [targetTable, setTargetTable] = useState<string>('');
  const [columnConfigs, setColumnConfigs] = useState<ImportColumnConfig[]>([]);
  const { data: tables } = useTables();
  const {
    data: fileSchema,
    isLoading: isSchemaLoading,
    error: schemaError,
  } = useFileSchema(fileId, open);
  const { data: targetSchema } = useTableSchema(mode === 'append' ? targetTable : null);
  const createTableMutation = useCreateTable();

  useEffect(() => {
    if (!open || !fileSchema) {
      return;
    }

    setColumnConfigs(createInitialImportColumnConfigs(fileSchema.columns));
  }, [fileSchema, open]);

  const selectedColumnCount = useMemo(
    () => columnConfigs.filter((columnConfig) => columnConfig.selected).length,
    [columnConfigs]
  );

  const columnValidationError = useMemo(
    () => getImportColumnValidationError(columnConfigs, mode === 'append' ? targetSchema : null),
    [columnConfigs, mode, targetSchema]
  );

  const isValid =
    mode === 'create'
      ? tableName.trim().length > 0 && !columnValidationError
      : targetTable.length > 0 && !columnValidationError;

  const resetState = () => {
    setMode('create');
    setTableName('');
    setTargetTable('');
    setColumnConfigs([]);
  };

  const handleCancel = () => {
    resetState();
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!isValid || !fileSchema) {
      return;
    }

    const columnMappings = toColumnMappings(columnConfigs);

    createTableMutation.mutate(
      {
        file_id: fileId,
        table_name: mode === 'create' ? tableName.trim() : '',
        mode,
        target_table: mode === 'append' ? targetTable : undefined,
        column_mappings: columnMappings,
      },
      {
        onSuccess: (data) => {
          const nextTableName = mode === 'append' ? targetTable : data.table_name;
          resetState();
          onOpenChange(false);
          onSuccess?.(nextTableName);
        },
      }
    );
  };

  const updateColumnConfig = (
    sourceName: string,
    updates: Partial<Pick<ImportColumnConfig, 'selected' | 'targetName'>>
  ) => {
    setColumnConfigs((currentColumnConfigs) =>
      currentColumnConfigs.map((columnConfig) =>
        columnConfig.sourceName === sourceName ? { ...columnConfig, ...updates } : columnConfig
      )
    );
  };

  const previewData = useMemo(() => {
    if (!fileSchema || fileSchema.preview_rows.length === 0) {
      return null;
    }

    const projectedPreview = projectImportPreview(
      fileSchema.columns,
      fileSchema.preview_rows,
      columnConfigs
    );

    return projectedPreview.columns.length > 0 ? projectedPreview : null;
  }, [columnConfigs, fileSchema]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }

        handleCancel();
      }}
    >
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-hidden p-0 sm:max-w-4xl">
        <div className="flex h-full max-h-[90vh] min-w-0 flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Import CSV to Table</DialogTitle>
            <DialogDescription>
              Choose which CSV columns to import, rename them if needed, and either create a new
              table or append into an existing one.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-w-0">
            <div className="min-w-0 space-y-6 px-6 py-4">
              <Tabs value={mode} onValueChange={(value) => setMode(value as ImportMode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create">Create New Table</TabsTrigger>
                  <TabsTrigger value="append">Append to Existing</TabsTrigger>
                </TabsList>

                <TabsContent value="create" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="table-name">Table Name</Label>
                    <Input
                      id="table-name"
                      value={tableName}
                      onChange={(event) => setTableName(event.target.value)}
                      placeholder="e.g., my_data"
                      disabled={createTableMutation.isPending}
                    />
                    <p className="text-xs text-quack-dark text-opacity-60">
                      Use alphanumeric characters and underscores only for the table name.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="append" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-table">Select Table</Label>
                    <Select
                      value={targetTable}
                      onValueChange={setTargetTable}
                      disabled={createTableMutation.isPending}
                    >
                      <SelectTrigger id="target-table">
                        <SelectValue placeholder="Choose a table to append to" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables && tables.length > 0 ? (
                          tables.map((table) => (
                            <SelectItem key={table.id} value={table.name}>
                              {table.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-tables" disabled>
                            No tables available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {targetSchema && targetSchema.length > 0 && (
                    <div className="space-y-2">
                      <Label>Target Schema</Label>
                      <div className="rounded-md border border-quack-dark border-opacity-20 bg-quack-gold bg-opacity-5 p-3">
                        <div className="flex flex-wrap gap-2">
                          {targetSchema.map((column) => (
                            <span
                              key={column.name}
                              className="rounded bg-quack-gold bg-opacity-20 px-2 py-1 text-xs text-quack-dark"
                            >
                              {column.name}{' '}
                              <span className="text-quack-dark text-opacity-60">
                                ({column.type})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-quack-dark text-opacity-60">
                        Selected CSV columns must rename to this schema exactly before append can
                        run.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <section className="min-w-0 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-quack-dark">CSV Columns</h3>
                    <p className="text-xs text-quack-dark text-opacity-60">
                      {selectedColumnCount} of {columnConfigs.length} columns selected
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setColumnConfigs((currentColumnConfigs) =>
                          currentColumnConfigs.map((columnConfig) => ({
                            ...columnConfig,
                            selected: true,
                          }))
                        )
                      }
                      disabled={
                        isSchemaLoading ||
                        createTableMutation.isPending ||
                        columnConfigs.length === 0
                      }
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setColumnConfigs((currentColumnConfigs) =>
                          currentColumnConfigs.map((columnConfig) => ({
                            ...columnConfig,
                            selected: false,
                          }))
                        )
                      }
                      disabled={
                        isSchemaLoading ||
                        createTableMutation.isPending ||
                        columnConfigs.length === 0
                      }
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {isSchemaLoading && (
                  <div className="rounded-md border border-quack-dark border-opacity-10 p-4 text-sm text-quack-dark text-opacity-70">
                    Loading CSV schema...
                  </div>
                )}

                {schemaError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {schemaError.message}
                  </div>
                )}

                {!isSchemaLoading && !schemaError && columnConfigs.length > 0 && (
                  <div className="w-full max-w-3xl overflow-scroll rounded-md border border-quack-dark border-opacity-10">
                    <table className="min-w-full w-max text-sm">
                      <thead className="sticky top-0 bg-quack-gold_bg">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-quack-dark">
                            Import
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-quack-dark">
                            CSV Column
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-quack-dark">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-quack-dark">
                            Destination Name
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-quack-dark divide-opacity-5 bg-white">
                        {columnConfigs.map((columnConfig) => (
                          <tr key={columnConfig.sourceName}>
                            <td className="px-4 py-3 align-middle">
                              <input
                                type="checkbox"
                                checked={columnConfig.selected}
                                onChange={(event) =>
                                  updateColumnConfig(columnConfig.sourceName, {
                                    selected: event.target.checked,
                                  })
                                }
                                disabled={createTableMutation.isPending}
                                aria-label={`Import ${columnConfig.sourceName}`}
                              />
                            </td>
                            <td className="px-4 py-3 font-medium whitespace-nowrap text-quack-dark">
                              {columnConfig.sourceName}
                            </td>
                            <td className="px-4 py-3 text-quack-dark text-opacity-70">
                              {columnConfig.type}
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                className="min-w-[12rem]"
                                value={columnConfig.targetName}
                                onChange={(event) =>
                                  updateColumnConfig(columnConfig.sourceName, {
                                    targetName: event.target.value,
                                  })
                                }
                                disabled={!columnConfig.selected || createTableMutation.isPending}
                                placeholder="Column name in table"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {columnValidationError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {columnValidationError}
                  </div>
                )}
              </section>

              {previewData && (
                <section className="min-w-0 space-y-2">
                  <div>
                    <h3 className="text-sm font-semibold text-quack-dark">CSV Preview</h3>
                    <p className="text-xs text-quack-dark text-opacity-60">
                      Sample rows from the uploaded file.
                    </p>
                  </div>
                  <div className="w-full max-w-3xl overflow-scroll rounded-md border border-quack-dark border-opacity-10">
                    <DataTable data={previewData} pageSize={5} />
                  </div>
                </section>
              )}

              {createTableMutation.isError && (
                <div className="text-sm text-red-600">{createTableMutation.error.message}</div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={createTableMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSchemaLoading || createTableMutation.isPending}
            >
              {createTableMutation.isPending
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Appending...'
                : mode === 'create'
                  ? 'Create Table'
                  : 'Append Data'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
