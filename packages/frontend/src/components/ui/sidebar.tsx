import * as React from 'react';
import { PanelLeft } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface SidebarContextValue {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
  defaultOpen = true,
  children,
}: {
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(!defaultOpen);

  const value = React.useMemo(
    () => ({
      isCollapsed,
      toggleSidebar: () => setIsCollapsed((current) => !current),
    }),
    [isCollapsed]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export function Sidebar({
  className,
  children,
}: React.HTMLAttributes<HTMLElement>) {
  const { isCollapsed } = useSidebar();

  return (
    <aside
      data-collapsed={isCollapsed}
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-quack-dark border-opacity-10 bg-white transition-[width] duration-200',
        isCollapsed ? 'w-16' : 'w-80',
        className
      )}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center border-b border-quack-dark border-opacity-10 p-3', className)}>
      {children}
    </div>
  );
}

export function SidebarContent({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>{children}</div>;
}

export function SidebarFooter({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-t border-quack-dark border-opacity-10 p-3', className)}>
      {children}
    </div>
  );
}

export function SidebarInset({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex min-w-0 flex-1 flex-col', className)}>{children}</div>;
}

export function SidebarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', className)}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}
