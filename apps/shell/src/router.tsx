import * as React from 'react';
import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { UiRoot } from '@libs/ui';

const Auth = React.lazy(() => import('auth/Module'));
const Chat = React.lazy(() => import('chat/Module'));
const Docs = React.lazy(() => import('docs/Module'));

function ShellHome() {
  return null;
}

const rootRoute = createRootRoute({
  component: () => (
    <UiRoot>
      <React.Suspense fallback={null}>
        <Outlet />
      </React.Suspense>
    </UiRoot>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ShellHome,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: Auth,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat',
  component: Chat,
});

const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/docs',
  component: Docs,
});

const routeTree = rootRoute.addChildren([indexRoute, authRoute, chatRoute, docsRoute]);

export const router = createRouter({ routeTree });
