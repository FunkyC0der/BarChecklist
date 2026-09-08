import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';

type TestRouterOptions = {
  additionalRoutes?: Array<{ component: ComponentType; path: string }>;
  component: ComponentType;
  initialPath?: string;
  layout?: ComponentType<{ children?: ReactNode }>;
  outsideRoutes?: Array<{ component: ComponentType; path: string }>;
  path?: string;
  wrapper?: ComponentType<{ children?: ReactNode }>;
};

/** Render a real TanStack route against memory history. */
export function renderWithRouter({
  additionalRoutes = [],
  component,
  path = '/',
  initialPath = path,
  layout: Layout,
  outsideRoutes = [],
  wrapper: Wrapper,
}: TestRouterOptions) {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
    validateSearch: (search) => search,
  });
  // Mirror src/app.tsx in both of its shapes:
  //
  // `wrapper` wraps a leaf route's own component inline. Guards live here,
  // because a guard hoisted into a pathless parent stays mounted across a
  // sibling navigation and can re-render mid-transition with a half-updated
  // location, causing it to redirect twice.
  //
  // `layout` instead builds a real pathless parent route rendering
  // `<Layout><Outlet /></Layout>`, which is how the authenticated app shell
  // is wired so that one AppLayout instance survives sibling navigations.
  const wrap = (Component: ComponentType) =>
    Wrapper
      ? () => (
          <Wrapper>
            <Component />
          </Wrapper>
        )
      : () => <Component />;
  const layoutRoute = Layout
    ? createRoute({
        component: () => (
          <Layout>
            <Outlet />
          </Layout>
        ),
        getParentRoute: () => rootRoute,
        id: 'test-layout',
      })
    : null;
  const getLeafParent = () => (layoutRoute ?? rootRoute) as typeof rootRoute;
  const route = createRoute({
    component: wrap(component),
    getParentRoute: getLeafParent,
    path,
  });
  const siblingRoutes = additionalRoutes.map(({ component, path: routePath }) =>
    createRoute({
      component: wrap(component),
      getParentRoute: getLeafParent,
      path: routePath,
    }),
  );
  const rootRoutes = outsideRoutes.map(({ component, path: routePath }) =>
    createRoute({
      component: () => {
        const Component = component;
        return <Component />;
      },
      getParentRoute: () => rootRoute,
      path: routePath,
    }),
  );
  const routeTree = layoutRoute
    ? rootRoute.addChildren([
        layoutRoute.addChildren([route, ...siblingRoutes]),
        ...rootRoutes,
      ])
    : rootRoute.addChildren([route, ...siblingRoutes, ...rootRoutes]);
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    routeTree,
  });
  void router.load();

  return { ...render(<RouterProvider router={router} />), router };
}
