import { act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { renderWithRouter } from '@/test/router';

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
  },
  refreshTeams: vi.fn(),
  selectTeam: vi.fn(),
  status: 'ready' as const,
  teams: [] as Array<{ id: string; name: string }>,
}));
const supabase = vi.hoisted(() => ({ channel: vi.fn() }));

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
// Regression coverage for the realtime status banners flashing on every tab
// switch: the team/today realtime channels must be opened once at the
// app-shell level, not torn down and recreated whenever a tab route remounts.
vi.mock('@/lib/supabase', () => {
  const channel: {
    on: () => typeof channel;
    subscribe: (callback?: (status: string) => void) => typeof channel;
  } = {
    on: () => channel,
    subscribe: (callback) => {
      callback?.('SUBSCRIBED');
      return channel;
    },
  };
  supabase.channel.mockImplementation(() => channel);
  return {
    getSupabase: () => ({
      channel: supabase.channel,
      removeChannel: vi.fn(),
    }),
  };
});

import { AppLayout } from './app-layout';

function TodayLeaf() {
  return <div>Today content</div>;
}
function TeamLeaf() {
  return <div>Team content</div>;
}

function renderApp(queryClient: QueryClient) {
  const withQueryClient = ({ children }: { children?: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AppLayout>{children}</AppLayout>
    </QueryClientProvider>
  );

  return renderWithRouter({
    additionalRoutes: [{ component: TeamLeaf, path: '/team' }],
    component: TodayLeaf,
    layout: withQueryClient,
    path: '/today',
  });
}

describe('AppLayout realtime channels', () => {
  beforeEach(() => {
    supabase.channel.mockClear();
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
  });

  it('keeps the same realtime channels open while switching tabs', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { findByText, router } = renderApp(queryClient);

    await findByText('Today content');
    await waitFor(() => expect(supabase.channel).toHaveBeenCalled());
    const openedAfterFirstMount = supabase.channel.mock.calls.length;

    await act(async () => {
      await router.navigate({ to: '/team' as never });
    });
    await findByText('Team content');

    await act(async () => {
      await router.navigate({ to: '/today' as never });
    });
    await findByText('Today content');

    await act(async () => {
      await router.navigate({ to: '/team' as never });
    });
    await findByText('Team content');

    // The team and today channels are opened once each, at the app-shell
    // level — switching tabs must not tear them down and reconnect.
    expect(supabase.channel).toHaveBeenCalledTimes(openedAfterFirstMount);
  });
});
