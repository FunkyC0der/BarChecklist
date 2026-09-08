import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  type RouterHistory,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { Authenticated, Guest, Root, Shell } from './app-shells';
import { ChecklistDetailRoute } from './routes/checklist-detail';
import { ChecklistsRoute } from './routes/checklists';
import { HistoryRoute } from './routes/history';
import { IndexRoute } from './routes/index';
import { JoinRoute } from './routes/join';
import { OnboardingRoute } from './routes/onboarding';
import { SignInRoute } from './routes/sign-in';
import { SignUpRoute } from './routes/sign-up';
import { TeamRoute } from './routes/team';
import { TodayRoute } from './routes/today';
import { UiKitRoute } from './routes/ui-kit';

const rootRoute = createRootRoute({ component: Root });
const route = (path: string, component: () => ReactNode) =>
  createRoute({ getParentRoute: () => rootRoute, path, component });
// Pathless layout route for the authenticated app shell. Keeping the shell in
// a shared parent (rather than inside each leaf route's component) preserves
// the AppLayout instance across sibling tab navigations, so the sticky header,
// the dock and the dock's `layoutId` pill animate instead of remounting.
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app-shell',
  component: () => (
    <Authenticated>
      <Shell>
        <Outlet />
      </Shell>
    </Authenticated>
  ),
});
const shellChild = (path: string, component: () => ReactNode) =>
  createRoute({ getParentRoute: () => shellRoute, path, component });
const routeTree = rootRoute.addChildren([
  route('/', IndexRoute),
  route('/sign-in', () => (
    <Guest>
      <SignInRoute />
    </Guest>
  )),
  route('/sign-up', () => (
    <Guest>
      <SignUpRoute />
    </Guest>
  )),
  route('/join/$token', JoinRoute),
  route('/ui-kit', UiKitRoute),
  route('/onboarding', () => (
    <Authenticated>
      <OnboardingRoute />
    </Authenticated>
  )),
  shellRoute.addChildren([
    shellChild('/today', TodayRoute),
    shellChild('/checklists', ChecklistsRoute),
    shellChild('/checklists/$checklistId', ChecklistDetailRoute),
    shellChild('/history', HistoryRoute),
    shellChild('/team', TeamRoute),
  ]),
]);
/** Build a router over the real route tree above. Tests pass a memory
 * history so they exercise this exact wiring (see app-shell-mount.test.tsx)
 * rather than a hand-rebuilt equivalent. */
export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, ...(history ? { history } : {}) });
}
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
