import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
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

import { RequireGuest, SessionGate } from './guards';

const token = 'a'.repeat(64);

function renderGuestRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RequireGuest />}>
          <Route element={<div>sign-up</div>} path="/sign-up" />
        </Route>
        <Route element={<div>join</div>} path="/join/:token" />
        <Route element={<div>today</div>} path="/today" />
        <Route element={<div>home</div>} path="/" />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireGuest', () => {
  beforeEach(() => {
    authState.initializationError = null;
    authState.initialized = true;
    authState.retrySessionInitialization.mockReset();
    authState.session = null;
  });

  it('keeps guests on the auth screen', () => {
    renderGuestRoute(`/sign-up?returnTo=/join/${token}`);
    expect(screen.getByText('sign-up')).toBeInTheDocument();
  });

  it('returns an authenticated user to the invite path instead of home', () => {
    authState.session = { user: { id: 'user-1' } };
    renderGuestRoute(`/sign-up?returnTo=/join/${token}`);
    expect(screen.getByText('join')).toBeInTheDocument();
  });

  it('sends an authenticated user home when there is no invite returnTo', () => {
    authState.session = { user: { id: 'user-1' } };
    renderGuestRoute('/sign-up');
    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('returns an authenticated user to a known product route with its query', () => {
    authState.session = { user: { id: 'user-1' } };
    renderGuestRoute('/sign-up?returnTo=/today%3Fdate%3D2026-09-06');
    expect(screen.getByText('today')).toBeInTheDocument();
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
