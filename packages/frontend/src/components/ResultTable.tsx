import { QueryResult } from '@/hooks/useQuery';
import { DataTable } from './ui/data-table';

interface ResultTableProps {
  result: QueryResult;
}

export function ResultTable({ result }: ResultTableProps) {
  if (!result || result.rows.length === 0) {
    return <div className="p-4 text-center text-quack-dark text-opacity-60">No results</div>;
  }

  const footerInfo = result.truncated
    ? `(limited from ${result.rowCount.toLocaleString()} total)`
    : '';

  return <DataTable data={result} footerInfo={footerInfo} />;
}
