import { useTablePreview } from '@/hooks/useTables';
import { DataTable } from './ui/data-table';
import { LoadingState, ErrorState } from './ui/loading-error';

interface TablePreviewProps {
  tableName: string | null;
}

export function TablePreview({ tableName }: TablePreviewProps) {
  const { data, isLoading, error } = useTablePreview(tableName, 100);

  if (!tableName) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-quack-dark text-opacity-60">Select a table to preview</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <LoadingState
        message="Loading table data..."
        className="flex items-center justify-center h-full"
      />
    );
  }

  if (error) {
    return <ErrorState error={error} className="flex items-center justify-center h-full" />;
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-quack-dark text-opacity-60">No data in table</div>
      </div>
    );
  }

  const footerInfo =
    data.row_count > data.rows.length
      ? `(limited from ${data.row_count.toLocaleString()} total)`
      : '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-quack-dark border-opacity-10 bg-white">
        <h2 className="text-lg font-semibold text-quack-dark">{tableName}</h2>
        <div className="text-sm text-quack-dark text-opacity-70">
          {data.row_count.toLocaleString()} total rows
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0">
        <DataTable data={data} footerInfo={footerInfo} />
      </div>
    </div>
  );
}
