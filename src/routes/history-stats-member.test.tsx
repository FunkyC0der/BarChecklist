import { screen } from '@testing-library/react';
import { renderWithRouter } from '@/test/router';
import { createTestQueryClient } from '@/test/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const statsApi = vi.hoisted(() => ({
  fetchMemberTaskStats: vi.fn(),
}));
const teamState = vi.hoisted(() => ({
  activeTeam: {
    id: 'team-1',
    name: 'Бар',
    owner_id: 'owner-1',
    timezone: 'Europe/Kyiv',
    created_at: '2026-01-01T00:00:00Z',
  } as {
    id: string;
    name: string;
    owner_id: string;
    timezone: string;
    created_at: string;
  } | null,
  status: 'ready' as 'error' | 'idle' | 'loading' | 'ready',
}));

vi.mock('@/features/stats/stats-api', () => statsApi);
vi.mock('@/features/teams/team-context', () => ({
  useTeams: () => teamState,
}));

import { HistoryStatsMemberRoute } from './history-stats-member';

const response = (overrides: Partial<Record<string, unknown>> = {}) => ({
  userId: 'user-1',
  displayName: 'Олена',
  currentMember: true,
  fromDate: '2026-08-11',
  toDate: '2026-09-09',
  logicalToday: '2026-09-09',
  completedCount: 2,
  tasks: [
    {
      taskId: 'task-1',
      taskTitle: 'Помити шейкери',
      checklistId: 'checklist-1',
      checklistName: 'Закриття',
      checklistArchived: false,
      taskArchived: false,
      completedCount: 1,
      lastCompletionDate: '2026-09-08',
    },
    {
      taskId: 'task-2',
      taskTitle: 'Порахувати касу',
      checklistId: 'checklist-2',
      checklistName: 'Архів',
      checklistArchived: true,
      taskArchived: false,
      completedCount: 1,
      lastCompletionDate: '2026-09-07',
    },
  ],
  ...overrides,
});

function renderMember(userId = 'user-1') {
  const queryClient = createTestQueryClient();
  return renderWithRouter({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <HistoryStatsMemberRoute />
      </QueryClientProvider>
    ),
    additionalRoutes: [{ component: () => null, path: '/history/stats' }],
    initialPath: `/history/stats/${userId}?from=2026-08-11&to=2026-09-09`,
    path: '/history/stats/$userId',
  });
}

describe('HistoryStatsMemberRoute', () => {
  beforeEach(() => {
    statsApi.fetchMemberTaskStats.mockReset();
    teamState.activeTeam = {
      id: 'team-1',
      name: 'Бар',
      owner_id: 'owner-1',
      timezone: 'Europe/Kyiv',
      created_at: '2026-01-01T00:00:00Z',
    };
    teamState.status = 'ready';
  });

  it('groups tasks by checklist and badges an archived checklist', async () => {
    statsApi.fetchMemberTaskStats.mockResolvedValue(response());
    renderMember();
    expect(await screen.findByText('Помити шейкери')).toBeInTheDocument();
    expect(screen.getByText('Порахувати касу')).toBeInTheDocument();
    expect(screen.getByText('Закриття')).toBeInTheDocument();
    expect(screen.getByText('Архів')).toBeInTheDocument();
    expect(screen.getByText('Архівний')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Олена', level: 1 }),
    ).toBeInTheDocument();
  });

  it('points back to the stats list with the period preserved', async () => {
    statsApi.fetchMemberTaskStats.mockResolvedValue(response());
    renderMember();
    await screen.findByText('Помити шейкери');
    expect(screen.getByRole('link', { name: 'Назад' })).toHaveAttribute(
      'href',
      '/history/stats?from=2026-08-11&to=2026-09-09',
    );
  });

  it('shows the empty state when the member has no completions in range', async () => {
    statsApi.fetchMemberTaskStats.mockResolvedValue(
      response({ completedCount: 0, tasks: [] }),
    );
    renderMember();
    expect(
      await screen.findByText('Цей учасник ще нічого не виконав за період.'),
    ).toBeInTheDocument();
  });

  it('badges a former member', async () => {
    statsApi.fetchMemberTaskStats.mockResolvedValue(
      response({ currentMember: false }),
    );
    renderMember();
    expect(await screen.findByText('Колишній учасник')).toBeInTheDocument();
  });
});
