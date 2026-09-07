import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui';

const teamState = vi.hoisted(() => ({
  activeTeam: null as { id: string } | null,
  status: 'ready' as 'error' | 'idle' | 'loading' | 'ready',
}));

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));
vi.mock('@/features/teams/team-context', () => ({
  useTeams: () => teamState,
}));

import { AppLayout } from './app-layout';
import { IndexRoute } from './index';

describe('no-team routing', () => {
  beforeEach(() => {
    teamState.activeTeam = null;
    teamState.status = 'ready';
    window.localStorage.clear();
  });

  it('lands an authenticated no-team user on Today', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<IndexRoute />} path="/" />
          <Route element={<div>Today destination</div>} path="/today" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Today destination')).toBeInTheDocument();
  });

  it('keeps the app shell available without redirecting to onboarding', () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/today']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route element={<div>Today content</div>} path="/today" />
            </Route>
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    expect(screen.getByText('Today content')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Розділи' }),
    ).toBeInTheDocument();
  });
});
