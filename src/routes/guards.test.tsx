import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  session: null as { user: { id: string } } | null,
}));

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    configIssue: null,
    initialized: true,
    session: authState.session,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
  }),
}));

import { RequireGuest } from './guards';

const token = 'a'.repeat(64);

function renderGuestRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RequireGuest />}>
          <Route element={<div>sign-up</div>} path="/sign-up" />
        </Route>
        <Route element={<div>join</div>} path="/join/:token" />
        <Route element={<div>home</div>} path="/" />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireGuest', () => {
  beforeEach(() => {
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
});
