import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '@/test/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

  it('lands an authenticated no-team user on Today', async () => {
    renderWithRouter({
      additionalRoutes: [
        { component: () => <div>Today destination</div>, path: '/today' },
      ],
      component: IndexRoute,
    });

    expect(await screen.findByText('Today destination')).toBeInTheDocument();
  });

  it('keeps the app shell available without redirecting to onboarding', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    renderWithRouter({
      component: () => <div>Today content</div>,
      initialPath: '/today',
      path: '/today',
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AppLayout>{children}</AppLayout>
          </ToastProvider>
        </QueryClientProvider>
      ),
    });

    expect(await screen.findByText('Today content')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Розділи' }),
    ).toBeInTheDocument();
  });

  it('dismisses the account menu on Escape and restores focus', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    renderWithRouter({
      component: () => <div>Today content</div>,
      initialPath: '/today',
      path: '/today',
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AppLayout>{children}</AppLayout>
          </ToastProvider>
        </QueryClientProvider>
      ),
    });

    const trigger = await screen.findByLabelText('Меню акаунта');

    fireEvent.click(trigger);
    const menu = await screen.findByRole('menu');

    fireEvent.pointerDown(menu);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it('opens the teams sheet from the accessible team selector', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    renderWithRouter({
      component: () => <div>Today content</div>,
      initialPath: '/today',
      path: '/today',
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AppLayout>{children}</AppLayout>
          </ToastProvider>
        </QueryClientProvider>
      ),
    });

    const selector = await screen.findByRole('button', {
      name: 'Обрати команду',
    });
    expect(selector.querySelector('svg')).toBeInTheDocument();

    fireEvent.click(selector);

    expect(
      await screen.findByRole('dialog', { name: 'Команди' }),
    ).toBeInTheDocument();
  });
});
