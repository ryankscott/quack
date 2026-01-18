import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { useTablePreview } from '@/hooks/useTables';

interface TablePreviewProps {
  tableName: string | null;
}

export function TablePreview({ tableName }: TablePreviewProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const { data, isLoading, error } = useTablePreview(tableName, 100);

  const columns = useMemo<ColumnDef<unknown[]>[]>(() => {
    if (!data || data.columns.length === 0) return [];

    return data.columns.map((col, index) => ({
      id: col.name,
      header: col.name,
      accessorFn: (row) => row[index],
      cell: (info) => {
        const value = info.getValue();
        if (value === null || value === undefined)
          return <span className="text-quack-dark text-opacity-40">null</span>;
        return String(value);
      },
    }));
  }, [data]);

  const table = useReactTable({
    data: data?.rows || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  if (!tableName) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-quack-dark text-opacity-60">Select a table to preview</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-quack-dark text-opacity-60">Loading table data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">Error: {error.message}</div>
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-quack-dark text-opacity-60">No data in table</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-quack-dark border-opacity-10 bg-white">
        <h2 className="text-lg font-semibold text-quack-dark">{tableName}</h2>
        <div className="text-sm text-quack-dark text-opacity-70">
          {data.row_count.toLocaleString()} total rows
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-quack-gold_bg sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-quack-dark uppercase tracking-wider border-b border-quack-dark border-opacity-10"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'cursor-pointer select-none flex items-center gap-1'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' ↑',
                          desc: ' ↓',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-quack-dark divide-opacity-5">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-quack-gold hover:bg-opacity-5">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 whitespace-nowrap text-quack-dark">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-quack-dark border-opacity-10 bg-white flex items-center justify-between">
        <div className="text-sm text-quack-dark text-opacity-70">
          Showing {table.getRowModel().rows.length} of {data.rows.length} rows
          {data.row_count > data.rows.length &&
            ` (limited from ${data.row_count.toLocaleString()} total)`}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 text-sm bg-quack-dark bg-opacity-10 text-quack-dark rounded hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-quack-dark">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 text-sm bg-quack-dark bg-opacity-10 text-quack-dark rounded hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
