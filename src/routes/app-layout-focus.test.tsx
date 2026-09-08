import { fireEvent, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { renderWithRouter } from '@/test/router';

const teamState = vi.hoisted(() => ({
  activeTeam: { id: 'team-1', name: 'Бар', owner_id: 'user-1' },
  selectTeam: vi.fn(),
  status: 'ready' as const,
  teams: [{ id: 'team-1', name: 'Бар', owner_id: 'user-1' }],
}));

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, signOut: vi.fn() }),
}));
vi.mock('@/features/teams/team-context', () => ({
  useTeams: () => teamState,
}));

import { AppLayout } from './app-layout';

describe('AppLayout menu focus', () => {
  it('keeps the desktop canvas separate from the centered app column', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    renderWithRouter({
      component: () => <div>Today</div>,
      layout: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <AppLayout>{children}</AppLayout>
        </QueryClientProvider>
      ),
      path: '/today',
    });

    const header = await screen.findByRole('banner');
    const column = header.parentElement;
    const canvas = column?.parentElement;
    expect(canvas).toHaveClass('bg-base-200', 'h-dvh');
    expect(column).toHaveClass('bg-base-100', 'w-full', 'sm:max-w-md');
  });

  it('restores the stable account-menu trigger after opening Teams from the menu', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    renderWithRouter({
      component: () => <div>Today</div>,
      layout: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <AppLayout>{children}</AppLayout>
        </QueryClientProvider>
      ),
      path: '/today',
    });

    const trigger = await screen.findByRole('button', {
      name: 'Меню акаунта',
    });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Команди' }));
    expect(
      await screen.findByRole('dialog', { name: 'Команди' }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
