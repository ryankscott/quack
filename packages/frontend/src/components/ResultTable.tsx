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
import { QueryResult } from '@/hooks/useQuery';

interface ResultTableProps {
  result: QueryResult;
}

export function ResultTable({ result }: ResultTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<unknown[]>[]>(() => {
    if (!result || result.columns.length === 0) return [];

    return result.columns.map((col, index) => ({
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
  }, [result]);

  const table = useReactTable({
    data: result?.rows || [],
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

  if (!result || result.rows.length === 0) {
    return <div className="p-4 text-center text-quack-dark text-opacity-60">No results</div>;
  }

  return (
    <div className="flex flex-col h-full border border-quack-dark border-opacity-10 rounded min-w-0">
      <div className="flex-1 overflow-auto min-w-0">
        <table className="text-sm min-w-full">
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

      <div className="p-3 border-t border-quack-dark border-opacity-10 bg-white flex items-center justify-between text-sm">
        <div className="text-quack-dark text-opacity-70">
          Showing {table.getRowModel().rows.length} of {result.rows.length} rows
          {result.truncated && ` (limited from ${result.rowCount.toLocaleString()} total)`}
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
