import { fireEvent, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui';
import { renderWithRouter } from '@/test/router';

const adminApi = vi.hoisted(() => ({
  fetchIsSuperAdmin: vi.fn(),
}));
const teamState = vi.hoisted(() => ({
  activeTeam: { id: 'team-1', name: 'Бар', owner_id: 'user-1' },
  selectTeam: vi.fn(),
  status: 'ready' as const,
  teams: [{ id: 'team-1', name: 'Бар', owner_id: 'user-1' }],
}));

vi.mock('@/features/admin/admin-api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/admin/admin-api')>();
  return { ...actual, ...adminApi };
});
vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, signOut: vi.fn() }),
}));
vi.mock('@/features/teams/team-context', () => ({
  useTeams: () => teamState,
}));
// AppLayout prefetches team data and mounts the team/today realtime
// providers, which all reach for the real Supabase client unless stubbed —
// this keeps the test from making actual network or WebSocket calls.
vi.mock('@/lib/supabase', () => {
  const chainable: unknown = new Proxy(
    {},
    {
      get: (_target, prop) =>
        prop === 'then'
          ? (resolve: (value: unknown) => void) =>
              resolve({ count: 0, data: [], error: null })
          : () => chainable,
    },
  );
  const channel: { on: () => typeof channel; subscribe: () => typeof channel } =
    {
      on: () => channel,
      subscribe: () => channel,
    };
  return {
    getSupabase: () => ({
      channel: () => channel,
      from: () => chainable,
      removeChannel: vi.fn(),
    }),
  };
});

import { AppLayout } from './app-layout';

function renderLayout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderWithRouter({
    component: () => <div>Today</div>,
    layout: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AppLayout>{children}</AppLayout>
        </ToastProvider>
      </QueryClientProvider>
    ),
    path: '/today',
  });
}

describe('AppLayout account menu — admin item', () => {
  it('omits the Адмінка item for a non-admin', async () => {
    adminApi.fetchIsSuperAdmin.mockResolvedValue(false);
    renderLayout();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Меню акаунта' }),
    );
    await screen.findByRole('menuitem', { name: 'Команди' });
    expect(
      screen.queryByRole('menuitem', { name: 'Адмінка' }),
    ).not.toBeInTheDocument();
  });

  it('shows the Адмінка item for a platform admin', async () => {
    adminApi.fetchIsSuperAdmin.mockResolvedValue(true);
    renderLayout();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Меню акаунта' }),
    );
    expect(
      await screen.findByRole('menuitem', { name: 'Адмінка' }),
    ).toBeInTheDocument();
  });
});
