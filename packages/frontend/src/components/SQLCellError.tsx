import { Alert, AlertDescription } from './ui/alert';

interface SQLCellErrorProps {
  error: string;
}

/**
 * Error display for SQL cell
 */
export function SQLCellError({ error }: SQLCellErrorProps) {
  return (
    <div className="px-4 pb-4">
      <Alert variant="destructive">
        <AlertDescription>
          <div className="font-semibold mb-1">Error</div>
          <div className="font-mono text-sm">{error}</div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
