import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useTables } from '@/hooks/useTables';
import { useTableSchema } from '@/hooks/useTableSchema';
import { useCreateTable } from '@/hooks/useTables';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  onSuccess?: (tableName: string) => void;
}

export function ImportDialog({ open, onOpenChange, fileId, onSuccess }: ImportDialogProps) {
  const [mode, setMode] = useState<'create' | 'append'>('create');
  const [tableName, setTableName] = useState('');
  const [targetTable, setTargetTable] = useState<string>('');
  const { data: tables } = useTables();
  const { data: schema } = useTableSchema(mode === 'append' ? targetTable : null);
  const createTableMutation = useCreateTable();

  const handleSubmit = () => {
    if (mode === 'create') {
      if (!tableName.trim()) return;

      createTableMutation.mutate(
        {
          file_id: fileId,
          table_name: tableName.trim(),
          mode: 'create',
        },
        {
          onSuccess: (data) => {
            setTableName('');
            setMode('create');
            onOpenChange(false);
            onSuccess?.(data.table_name);
          },
        }
      );
    } else {
      if (!targetTable) return;

      createTableMutation.mutate(
        {
          file_id: fileId,
          table_name: '', // Not used in append mode
          mode: 'append',
          target_table: targetTable,
        },
        {
          onSuccess: () => {
            setTargetTable('');
            setMode('create');
            onOpenChange(false);
            onSuccess?.(targetTable);
          },
        }
      );
    }
  };

  const handleCancel = () => {
    setTableName('');
    setTargetTable('');
    setMode('create');
    onOpenChange(false);
  };

  const isValid = mode === 'create' ? tableName.trim() : targetTable !== '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import CSV to Table</DialogTitle>
          <DialogDescription>
            Choose to create a new table or append data to an existing table.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => setMode(value as 'create' | 'append')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New Table</TabsTrigger>
            <TabsTrigger value="append">Append to Existing</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="table-name">Table Name</Label>
              <Input
                id="table-name"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="e.g., my_data"
                disabled={createTableMutation.isPending}
              />
              <p className="text-xs text-quack-dark text-opacity-60">
                Use alphanumeric characters and underscores only
              </p>
            </div>
          </TabsContent>

          <TabsContent value="append" className="space-y-4 mt-4">
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

            {schema && schema.length > 0 && (
              <div className="space-y-2">
                <Label>Table Schema</Label>
                <div className="rounded-md border border-quack-dark border-opacity-20 p-3 bg-quack-gold bg-opacity-5">
                  <div className="text-xs font-medium text-quack-dark mb-2">Columns:</div>
                  <div className="flex flex-wrap gap-2">
                    {schema.map((col) => (
                      <span
                        key={col.name}
                        className="text-xs px-2 py-1 rounded bg-quack-gold bg-opacity-20 text-quack-dark"
                      >
                        {col.name} <span className="text-opacity-60">({col.type})</span>
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-quack-dark text-opacity-60">
                  CSV columns must match this schema for append to succeed
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {createTableMutation.isError && (
          <div className="text-sm text-red-600 mt-2">
            {createTableMutation.error.message}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={createTableMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createTableMutation.isPending}
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
      </DialogContent>
    </Dialog>
  );
}
