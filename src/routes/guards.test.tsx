import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '@/test/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  initializationError: null as string | null,
  initialized: true,
  retrySessionInitialization: vi.fn(),
  session: null as { user: { id: string } } | null,
}));

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    configIssue: null,
    initializationError: authState.initializationError,
    initialized: authState.initialized,
    retrySessionInitialization: authState.retrySessionInitialization,
    session: authState.session,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
  }),
}));

import { RequireAuth, RequireGuest, SessionGate } from './guards';

const token = 'a'.repeat(64);

function renderGuestRoute(path: string) {
  return renderWithRouter({
    component: () => <div>sign-up</div>,
    initialPath: path,
    outsideRoutes: [
      { component: () => <div>join</div>, path: '/join/$token' },
      { component: () => <div>today</div>, path: '/today' },
      { component: () => <div>home</div>, path: '/' },
    ],
    path: '/sign-up',
    wrapper: RequireGuest,
  });
}

describe('RequireGuest', () => {
  beforeEach(() => {
    authState.initializationError = null;
    authState.initialized = true;
    authState.retrySessionInitialization.mockReset();
    authState.session = null;
  });

  it('keeps guests on the auth screen', async () => {
    renderGuestRoute(`/sign-up?returnTo=/join/${token}`);
    expect(await screen.findByText('sign-up')).toBeInTheDocument();
  });

  it('returns an authenticated user to the invite path instead of home', async () => {
    authState.session = { user: { id: 'user-1' } };
    renderGuestRoute(`/sign-up?returnTo=/join/${token}`);
    expect(await screen.findByText('join')).toBeInTheDocument();
  });

  it('sends an authenticated user to Today when there is no invite returnTo', async () => {
    authState.session = { user: { id: 'user-1' } };
    renderGuestRoute('/sign-up');
    expect(await screen.findByText('today')).toBeInTheDocument();
  });

  it('returns an authenticated user to a known product route with its query', async () => {
    authState.session = { user: { id: 'user-1' } };
    renderGuestRoute('/sign-up?returnTo=/today%3Fdate%3D2026-09-06');
    expect(await screen.findByText('today')).toBeInTheDocument();
  });
});

// The authenticated shell lives in a pathless parent route (see src/app.tsx),
// so RequireAuth is exercised here through `layout` rather than `wrapper`.
function renderProtectedRoutes(initialPath: string) {
  return renderWithRouter({
    additionalRoutes: [
      { component: () => <div>checklists</div>, path: '/checklists' },
    ],
    component: () => <div>today</div>,
    initialPath,
    layout: RequireAuth,
    outsideRoutes: [
      { component: () => <div>sign-in</div>, path: '/sign-in' },
      { component: () => <div>join</div>, path: '/join/$token' },
      { component: () => <div>home</div>, path: '/' },
    ],
    path: '/today',
  });
}

describe('RequireAuth in a shared layout route', () => {
  beforeEach(() => {
    authState.initializationError = null;
    authState.initialized = true;
    authState.session = null;
    window.history.replaceState({}, '', '/');
  });

  // Note: memory history pins window.location for the whole test, so this
  // case cannot see the target being recomputed mid-redirect. That is
  // covered directly in guards-redirect.test.tsx.
  it('sends an unauthenticated user to sign-in with a returnTo for the current path', async () => {
    window.history.replaceState({}, '', '/today');
    const { router } = renderProtectedRoutes('/today');

    expect(await screen.findByText('sign-in')).toBeInTheDocument();
    expect(router.state.location.href).toContain(
      `returnTo=${encodeURIComponent('/today')}`,
    );
  });

  it('sends an unauthenticated user to bare sign-in for an unknown path', async () => {
    window.history.replaceState({}, '', '/not-a-product-path');
    const { router } = renderProtectedRoutes('/today');

    expect(await screen.findByText('sign-in')).toBeInTheDocument();
    expect(router.state.location.href).not.toContain('returnTo');
  });

  it('renders protected routes for a signed-in user', async () => {
    authState.session = { user: { id: 'user-1' } };
    renderProtectedRoutes('/today');

    expect(await screen.findByText('today')).toBeInTheDocument();
  });

  it('serves a direct load of a sibling protected route', async () => {
    authState.session = { user: { id: 'user-1' } };
    renderProtectedRoutes('/checklists');

    expect(await screen.findByText('checklists')).toBeInTheDocument();
  });

  // This case has a session, so RequireAuth renders children and never
  // redirects; it covers the shared layout serving siblings across history
  // back/forward. Redirect *counting* needs a signed-out user and cannot be
  // observed under memory history (window.location never moves), so it lives
  // in guards-redirect.test.tsx.
  it('serves sibling protected routes across history back and forward', async () => {
    authState.session = { user: { id: 'user-1' } };
    const { router } = renderProtectedRoutes('/today');

    await screen.findByText('today');
    router.history.push('/checklists');
    expect(await screen.findByText('checklists')).toBeInTheDocument();

    router.history.back();
    await waitFor(() => expect(router.state.location.pathname).toBe('/today'));
    expect(await screen.findByText('today')).toBeInTheDocument();

    router.history.forward();
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/checklists'),
    );
    expect(await screen.findByText('checklists')).toBeInTheDocument();
  });
});

describe('SessionGate', () => {
  it('lets the user retry a failed session initialization', () => {
    authState.initializationError = 'network unavailable';

    render(
      <SessionGate>
        <div>app</div>
      </SessionGate>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Спробувати ще раз' }));
    expect(authState.retrySessionInitialization).toHaveBeenCalledOnce();
  });
});
