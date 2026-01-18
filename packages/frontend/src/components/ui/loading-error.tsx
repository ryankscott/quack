import { Alert, AlertDescription } from './alert';
import { Skeleton } from './skeleton';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

/**
 * Reusable loading state component with skeleton
 */
export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={className || 'p-4'}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      {message && <div className="mt-2 text-sm text-quack-dark text-opacity-60">{message}</div>}
    </div>
  );
}

interface ErrorStateProps {
  error: Error | string;
  className?: string;
  title?: string;
}

/**
 * Reusable error state component with alert
 */
export function ErrorState({ error, className, title = 'Error' }: ErrorStateProps) {
  const message = typeof error === 'string' ? error : error.message;

  return (
    <div className={className || 'p-4'}>
      <Alert variant="destructive">
        <AlertDescription>
          <strong>{title}:</strong> {message}
        </AlertDescription>
      </Alert>
    </div>
  );
}
