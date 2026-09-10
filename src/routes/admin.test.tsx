import { fireEvent, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/test/query-client';
import { renderWithRouter } from '@/test/router';

const adminApi = vi.hoisted(() => ({
  fetchIsSuperAdmin: vi.fn(),
  fetchPlatformOverview: vi.fn(),
  fetchPlatformTeams: vi.fn(),
}));

vi.mock('@/features/admin/admin-api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/admin/admin-api')>();
  return { ...actual, ...adminApi };
});
vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

import { RequireSuperAdmin } from './guards';
import { AdminRoute } from './admin';

const overview = (overrides: Partial<Record<string, unknown>> = {}) => ({
  generatedAt: '2026-09-09T12:00:00Z',
  totals: {
    users: 42,
    teams: 7,
    memberships: 12,
    checklists: 20,
    checklistsDeleted: 2,
    tasks: 80,
    tasksDeleted: 5,
    completions: 300,
    openInvites: 1,
  },
  growth: {
    usersLast7: 3,
    usersLast30: 10,
    teamsLast7: 1,
    teamsLast30: 2,
    completionsLast7: 40,
    completionsLast30: 150,
  },
  activity: {
    activeTeamsLast7: 4,
    activeTeamsLast30: 6,
    activeUsersLast7: 8,
    activeUsersLast30: 11,
  },
  ...overrides,
});

const team = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'team-1',
  name: 'Бар',
  timezone: 'Europe/Kyiv',
  createdAt: '2026-01-01T00:00:00Z',
  ownerId: 'owner-1',
  ownerName: 'Олена',
  ownerEmail: 'olena@example.com',
  memberCount: 3,
  checklistCount: 2,
  taskCount: 5,
  completionCount: 30,
  lastCompletionAt: '2026-09-08T10:00:00Z',
  hasOpenInvite: false,
  ...overrides,
});

function renderAdmin() {
  const queryClient = createTestQueryClient();
  return renderWithRouter({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <RequireSuperAdmin>
          <AdminRoute />
        </RequireSuperAdmin>
      </QueryClientProvider>
    ),
    outsideRoutes: [{ component: () => <div>Сьогодні</div>, path: '/today' }],
    path: '/admin',
  });
}

describe('AdminRoute', () => {
  it('redirects a non-admin to /today without rendering admin content', async () => {
    adminApi.fetchIsSuperAdmin.mockResolvedValue(false);
    renderAdmin();
    expect(await screen.findByText('Сьогодні')).toBeInTheDocument();
    expect(screen.queryByText('Адмінка')).not.toBeInTheDocument();
  });

  it('shows totals and team rows for an admin', async () => {
    adminApi.fetchIsSuperAdmin.mockResolvedValue(true);
    adminApi.fetchPlatformOverview.mockResolvedValue(overview());
    adminApi.fetchPlatformTeams.mockResolvedValue({
      total: 1,
      limit: 50,
      offset: 0,
      sort: 'recent_activity',
      teams: [team()],
    });
    renderAdmin();
    expect(await screen.findByText('Адмінка')).toBeInTheDocument();
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('Бар')).toBeInTheDocument();
    expect(screen.getByText(/Олена · olena@example.com/)).toBeInTheDocument();
  });

  it('shows a retry alert when the overview RPC fails', async () => {
    adminApi.fetchIsSuperAdmin.mockResolvedValue(true);
    adminApi.fetchPlatformOverview.mockRejectedValue(new Error('boom'));
    adminApi.fetchPlatformTeams.mockResolvedValue({
      total: 0,
      limit: 50,
      offset: 0,
      sort: 'recent_activity',
      teams: [],
    });
    renderAdmin();
    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Повторити' }),
    ).toBeInTheDocument();
  });

  it('loads the next page with an increasing offset on "Показати ще"', async () => {
    adminApi.fetchIsSuperAdmin.mockResolvedValue(true);
    adminApi.fetchPlatformOverview.mockResolvedValue(overview());
    adminApi.fetchPlatformTeams.mockImplementation(
      async ({ offset }: { offset: number }) => ({
        total: 60,
        limit: 50,
        offset,
        sort: 'recent_activity',
        teams: [team({ id: `team-${offset}` })],
      }),
    );
    renderAdmin();
    await screen.findByText('Бар');
    fireEvent.click(screen.getByRole('button', { name: 'Показати ще' }));
    await waitFor(() =>
      expect(adminApi.fetchPlatformTeams).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 50 }),
      ),
    );
  });
});
