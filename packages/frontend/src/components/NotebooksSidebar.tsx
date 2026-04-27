import { NotebooksList } from './NotebooksList';
import type { Notebook } from '@/hooks/useNotebooks';
import { Sidebar, SidebarContent, SidebarHeader, SidebarTrigger, useSidebar } from './ui/sidebar';
import { cn } from '@/lib/utils';

interface NotebooksSidebarProps {
  currentNotebookId: string | null;
  onSelectNotebook: (notebook: Notebook) => void;
  onCreateNotebook: () => void;
  onDeleteNotebook: (notebookId: string) => Promise<void>;
}

/**
 * Sidebar for displaying notebooks
 */
export function NotebooksSidebar({
  currentNotebookId,
  onSelectNotebook,
  onCreateNotebook,
  onDeleteNotebook,
}: NotebooksSidebarProps) {
  const { isCollapsed } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className={cn(isCollapsed ? 'justify-center px-2' : 'justify-between px-4')}>
        {!isCollapsed && (
          <h2 className="text-sm font-semibold uppercase tracking-wide text-quack-dark">Notebooks</h2>
        )}
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <NotebooksList
          currentNotebookId={currentNotebookId}
          onSelectNotebook={onSelectNotebook}
          onCreateNotebook={onCreateNotebook}
          onDeleteNotebook={onDeleteNotebook}
          collapsed={isCollapsed}
        />
      </SidebarContent>
    </Sidebar>
  );
}
