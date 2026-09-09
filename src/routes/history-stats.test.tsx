import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { renderWithRouter } from '@/test/router';
import { createTestQueryClient } from '@/test/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const statsApi = vi.hoisted(() => ({
  fetchMemberStats: vi.fn(),
}));
const historyApi = vi.hoisted(() => ({
  fetchHistoryFilterOptions: vi.fn(),
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
vi.mock('@/features/history/history-api', () => historyApi);
vi.mock('@/features/teams/team-context', () => ({
  useTeams: () => teamState,
}));
vi.mock('@/components/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui')>();
  return {
    ...actual,
    Sheet: ({
      children,
      open,
      title,
      onClose,
    }: {
      children: ReactNode;
      open: boolean;
      title?: string;
      onClose: () => void;
    }) =>
      open ? (
        <div aria-label={title} role="dialog">
          <button aria-label="Закрити" onClick={onClose}>
            ×
          </button>
          {children}
        </div>
      ) : null,
  };
});

import { HistoryStatsRoute } from './history-stats';

const snapshot = (
  members: Array<Record<string, unknown>> = [],
  extra: Partial<Record<string, unknown>> = {},
) => ({
  logicalToday: '2026-09-09',
  fromDate: '2026-08-11',
  toDate: '2026-09-09',
  teamCompletedCount: members.reduce(
    (sum, member) => sum + Number(member.completedCount ?? 0),
    0,
  ),
  members,
  ...extra,
});
const member = (overrides: Partial<Record<string, unknown>> = {}) => ({
  userId: 'user-1',
  displayName: 'Олена',
  currentMember: true,
  completedCount: 5,
  taskCount: 2,
  lastCompletionDate: '2026-09-08',
  ...overrides,
});

function renderStats(initialPath = '/history/stats') {
  const queryClient = createTestQueryClient();
  return renderWithRouter({
    additionalRoutes: [{ component: () => null, path: '/history' }],
    component: () => (
      <QueryClientProvider client={queryClient}>
        <HistoryStatsRoute />
      </QueryClientProvider>
    ),
    initialPath,
    path: '/history/stats',
  });
}

describe('HistoryStatsRoute', () => {
  beforeEach(() => {
    statsApi.fetchMemberStats.mockReset();
    historyApi.fetchHistoryFilterOptions.mockReset();
    historyApi.fetchHistoryFilterOptions.mockResolvedValue({
      checklists: [{ id: 'checklist-1', name: 'Відкриття', archived: false }],
      users: [],
    });
    teamState.activeTeam = {
      id: 'team-1',
      name: 'Бар',
      owner_id: 'owner-1',
      timezone: 'Europe/Kyiv',
      created_at: '2026-01-01T00:00:00Z',
    };
    teamState.status = 'ready';
  });

  it('renders a ranked member list with a zero-completion member and a former-member badge', async () => {
    statsApi.fetchMemberStats.mockResolvedValue(
      snapshot([
        member({ userId: 'user-1', displayName: 'Олена', completedCount: 5 }),
        member({
          userId: 'user-2',
          displayName: 'Ігор',
          completedCount: 0,
          taskCount: 0,
          lastCompletionDate: null,
        }),
        member({
          userId: 'user-3',
          displayName: 'Марія',
          currentMember: false,
          completedCount: 2,
        }),
      ]),
    );
    renderStats();
    expect(await screen.findByText('Олена')).toBeInTheDocument();
    expect(screen.getByText('Ігор')).toBeInTheDocument();
    expect(screen.getByText('Немає виконаних завдань')).toBeInTheDocument();
    expect(screen.getByText('Марія')).toBeInTheDocument();
    expect(screen.getByText('Колишній учасник')).toBeInTheDocument();
  });

  it('switches presets and refetches with the new range', async () => {
    statsApi.fetchMemberStats.mockResolvedValue(snapshot([member()]));
    renderStats();
    await screen.findByText('Олена');
    fireEvent.click(screen.getByRole('button', { name: '7 днів' }));
    await waitFor(() =>
      expect(statsApi.fetchMemberStats).toHaveBeenLastCalledWith(
        'team-1',
        expect.objectContaining({
          fromDate: '2026-09-03',
          toDate: '2026-09-09',
        }),
      ),
    );
  });

  it('applies a custom range from the filter sheet', async () => {
    statsApi.fetchMemberStats.mockResolvedValue(snapshot([member()]));
    renderStats();
    await screen.findByText('Олена');
    fireEvent.click(screen.getByRole('button', { name: 'Фільтри статистики' }));
    fireEvent.change(screen.getByLabelText('Від дати'), {
      target: { value: '2026-08-01' },
    });
    fireEvent.change(screen.getByLabelText('До дати'), {
      target: { value: '2026-08-15' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Застосувати' }));
    await waitFor(() =>
      expect(statsApi.fetchMemberStats).toHaveBeenLastCalledWith(
        'team-1',
        expect.objectContaining({
          fromDate: '2026-08-01',
          toDate: '2026-08-15',
        }),
      ),
    );
  });

  it('distinguishes the empty state from a filtered empty result', async () => {
    statsApi.fetchMemberStats.mockResolvedValueOnce(snapshot([]));
    renderStats();
    expect(
      await screen.findByText('Ще немає виконаних завдань'),
    ).toBeInTheDocument();

    statsApi.fetchMemberStats.mockResolvedValueOnce(snapshot([]));
    fireEvent.click(screen.getByRole('button', { name: 'Фільтри статистики' }));
    fireEvent.change(screen.getByLabelText('Чекліст'), {
      target: { value: 'checklist-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Застосувати' }));
    expect(await screen.findByText('Нічого не знайдено')).toBeInTheDocument();
  });

  it('shows a permission-denied alert', async () => {
    statsApi.fetchMemberStats.mockRejectedValueOnce({ code: '42501' });
    renderStats();
    expect(
      await screen.findByText(/немає доступу до статистики/),
    ).toBeInTheDocument();
  });

  it('marks the Статистика tab as the active view', async () => {
    statsApi.fetchMemberStats.mockResolvedValue(snapshot([member()]));
    renderStats();
    await screen.findByText('Олена');
    expect(screen.getByRole('tab', { name: 'Статистика' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('tab', { name: 'Записи' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
