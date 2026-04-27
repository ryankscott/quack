import { RootRoute, Router, Route, Outlet, Navigate } from '@tanstack/react-router';
import { Layout } from '@/components/Layout';
import { DataPage } from './data';
import { NotebooksPage } from './notebooks';

interface NotebooksSearch {
  notebookId?: string;
}

const rootRoute = new RootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/data" />,
});

const dataRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/data',
  component: DataPage,
});

const notebooksRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/notebooks',
  validateSearch: (search: Record<string, unknown>): NotebooksSearch => ({
    notebookId: typeof search.notebookId === 'string' ? search.notebookId : undefined,
  }),
  component: NotebooksPage,
});

const routeTree = rootRoute.addChildren([indexRoute, dataRoute, notebooksRoute]);

export const router = new Router({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
