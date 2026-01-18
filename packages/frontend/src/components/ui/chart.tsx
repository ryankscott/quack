import * as React from 'react';
import { cn } from '@/lib/utils';

const ChartContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-quack-dark border-opacity-10 bg-white p-4',
        className
      )}
      {...props}
    />
  )
);
ChartContainer.displayName = 'ChartContainer';

const ChartTooltip = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-md',
        className
      )}
      {...props}
    />
  )
);
ChartTooltip.displayName = 'ChartTooltip';

const ChartTooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('grid gap-2', className)} {...props} />
  )
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

export { ChartContainer, ChartTooltip, ChartTooltipContent };
