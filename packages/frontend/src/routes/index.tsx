import { RootRoute, Router, Route, Outlet } from '@tanstack/react-router';
import { Layout } from '@/components/Layout';
import { ExplorerPage } from './explorer';
import { WorkspacePage } from './workspace';

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
  component: () => {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-quack-golden bg-opacity-20">
        <img src="/quack_icon.svg" alt="Quack" className="w-48 h-48 mb-8" />
        <h2 className="text-4xl font-bold mb-2 text-quack-dark">Welcome to Quack</h2>
        <p className="text-quack-dark text-opacity-70 mb-8 text-center max-w-md">
          A local-first data exploration tool. Upload CSV files and query them with SQL.
        </p>
        <div className="flex gap-4">
          <a href="/explorer" className="btn-primary rounded-lg font-medium">
            Start Exploring
          </a>
          <a href="/workspace" className="btn-secondary rounded-lg font-medium">
            View Workspace
          </a>
        </div>
      </div>
    );
  },
});

const explorerRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/explorer',
  component: ExplorerPage,
});

const workspaceRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/workspace',
  component: WorkspacePage,
});

const routeTree = rootRoute.addChildren([indexRoute, explorerRoute, workspaceRoute]);

export const router = new Router({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
