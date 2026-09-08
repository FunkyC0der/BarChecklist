import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { renderWithRouter } from '@/test/router';
import { queryKeys } from '@/lib/query-client';

const api = vi.hoisted(() => ({
  fetchActiveTaskCounts: vi.fn(),
  fetchChecklists: vi.fn(),
  fetchHistory: vi.fn(),
  fetchHistoryFilterOptions: vi.fn(),
  fetchTeamMembers: vi.fn(),
  fetchTodaySnapshot: vi.fn(),
}));
const teamState = vi.hoisted(() => ({
  activeTeam: {
    created_at: '2026-09-01T00:00:00Z',
    id: 'team-1',
    name: 'Бар',
    owner_id: 'owner-1',
    timezone: 'Europe/Kyiv',
    updated_at: '2026-09-01T00:00:00Z',
  } as {
    created_at: string;
    id: string;
    name: string;
    owner_id: string;
    timezone: string;
    updated_at: string;
  } | null,
  selectTeam: vi.fn(),
  status: 'ready' as 'error' | 'idle' | 'loading' | 'ready',
  teams: [] as Array<{ id: string; name: string }>,
}));

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    session: { user: { id: 'owner-1' } },
    signOut: vi.fn(),
  }),
}));
vi.mock('@/features/teams/team-context', () => ({
  useTeams: () => teamState,
}));
vi.mock('@/features/completions/today-api', () => ({
  fetchTodaySnapshot: api.fetchTodaySnapshot,
}));
vi.mock('@/features/checklists/checklist-api', () => ({
  fetchActiveTaskCounts: api.fetchActiveTaskCounts,
  fetchChecklists: api.fetchChecklists,
}));
vi.mock('@/features/teams/team-api', () => ({
  fetchTeamMembers: api.fetchTeamMembers,
}));
vi.mock('@/features/history/history-api', () => ({
  fetchHistory: api.fetchHistory,
  fetchHistoryFilterOptions: api.fetchHistoryFilterOptions,
}));

import { AppLayout } from './app-layout';

function renderApp(queryClient: QueryClient) {
  const withQueryClient = ({ children }: { children?: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AppLayout>{children}</AppLayout>
    </QueryClientProvider>
  );

  return renderWithRouter({
    component: () => <div>Leaf content</div>,
    layout: withQueryClient,
    path: '/today',
  });
}

describe('AppLayout tab prefetch', () => {
  beforeEach(() => {
    api.fetchActiveTaskCounts.mockReset().mockResolvedValue(new Map());
    api.fetchChecklists.mockReset().mockResolvedValue([]);
    api.fetchHistory.mockReset().mockResolvedValue({
      days: [],
      fromDate: '2026-08-23',
      hasMore: false,
      logicalToday: '2026-09-05',
      nextBeforeDate: null,
      toDate: '2026-09-05',
    });
    api.fetchHistoryFilterOptions
      .mockReset()
      .mockResolvedValue({ checklists: [], users: [] });
    api.fetchTeamMembers.mockReset().mockResolvedValue([]);
    api.fetchTodaySnapshot.mockReset().mockResolvedValue({
      checklists: [],
      logicalDate: '2026-09-05',
      timezone: 'Europe/Kyiv',
    });
    teamState.status = 'ready';
    teamState.teams = [];
  });

  it('prefetches the other tabs’ queries without navigating to them', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderApp(queryClient);

    await waitFor(() => {
      expect(
        queryClient.getQueryData(queryKeys.checklistList('team-1')),
      ).toBeDefined();
    });
    expect(
      queryClient.getQueryData(queryKeys.teamMembers('team-1')),
    ).toBeDefined();
    expect(
      queryClient.getQueryData(queryKeys.historyOptions('team-1')),
    ).toBeDefined();
    await waitFor(() => {
      expect(
        queryClient.getQueryData(
          queryKeys.history('team-1', {
            beforeDate: null,
            checklistId: null,
            fromDate: null,
            toDate: null,
            userId: null,
          }),
        ),
      ).toBeDefined();
    });
    expect(api.fetchChecklists).toHaveBeenCalledWith('team-1');
    expect(api.fetchTeamMembers).toHaveBeenCalledWith('team-1');
    expect(api.fetchHistory).toHaveBeenCalled();
    expect(api.fetchHistoryFilterOptions).toHaveBeenCalledWith('team-1');
    expect(api.fetchTodaySnapshot).toHaveBeenCalledWith('team-1');
  });
});
