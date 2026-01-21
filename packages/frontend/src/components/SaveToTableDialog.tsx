import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useSaveQueryToTable } from '@/hooks/useSaveQueryToTable';

interface SaveToTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sql: string;
  allowedTables?: string[];
  onSuccess?: (tableName: string, rowCount: number) => void;
}

export function SaveToTableDialog({
  open,
  onOpenChange,
  sql,
  allowedTables,
  onSuccess,
}: SaveToTableDialogProps) {
  const [tableName, setTableName] = useState('');
  const [description, setDescription] = useState('');
  const saveToTableMutation = useSaveQueryToTable();

  const handleSubmit = () => {
    if (!tableName.trim()) return;

    saveToTableMutation.mutate(
      {
        sql,
        table_name: tableName.trim(),
        description: description.trim() || undefined,
        allowed_tables: allowedTables,
      },
      {
        onSuccess: (data) => {
          setTableName('');
          setDescription('');
          onOpenChange(false);
          onSuccess?.(data.table_name, data.row_count);
        },
      }
    );
  };

  const handleCancel = () => {
    setTableName('');
    setDescription('');
    onOpenChange(false);
  };

  const isValid = tableName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Query Results to Table</DialogTitle>
          <DialogDescription>
            Create a new table containing the results of your query.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="save-table-name">Table Name</Label>
            <Input
              id="save-table-name"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="e.g., my_results"
              disabled={saveToTableMutation.isPending}
            />
            <p className="text-xs text-quack-dark text-opacity-60">
              Use alphanumeric characters and underscores only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="table-description">Description (optional)</Label>
            <Textarea
              id="table-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this table contains..."
              rows={3}
              disabled={saveToTableMutation.isPending}
            />
          </div>
        </div>

        {saveToTableMutation.isError && (
          <div className="text-sm text-red-600 mt-2">{saveToTableMutation.error.message}</div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saveToTableMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || saveToTableMutation.isPending}>
            {saveToTableMutation.isPending ? 'Creating...' : 'Create Table'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
