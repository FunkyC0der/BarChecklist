import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TodaySnapshot } from '@/features/completions/today-api';

const api = vi.hoisted(() => ({
  completeTask: vi.fn(),
  fetchTodaySnapshot: vi.fn(),
  uncompleteTask: vi.fn(),
}));
const authState = vi.hoisted(() => ({
  userId: 'member-2',
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
  status: 'ready' as 'error' | 'idle' | 'loading' | 'ready',
}));
const realtimeState = vi.hoisted(() => ({
  retry: vi.fn(),
  status: 'connected' as 'connecting' | 'connected' | 'degraded',
}));
const showToast = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    configIssue: null,
    initialized: true,
    session: {
      user: {
        id: authState.userId,
        user_metadata: { display_name: 'Іван' },
      },
    },
  }),
}));

vi.mock('@/features/teams/team-context', () => ({
  useTeams: () => ({
    activeTeam: teamState.activeTeam,
    status: teamState.status,
  }),
}));

vi.mock('@/features/completions/today-api', () => ({
  completeTask: api.completeTask,
  fetchTodaySnapshot: api.fetchTodaySnapshot,
  uncompleteTask: api.uncompleteTask,
}));

vi.mock('@/features/completions/use-today-realtime', () => ({
  useTodayRealtime: () => ({
    realtimeStatus: realtimeState.status,
    retryRealtime: realtimeState.retry,
  }),
}));

vi.mock('@/features/completions/use-logical-date-refresh', () => ({
  useLogicalDateRefresh: vi.fn(),
}));

vi.mock('@/components/ui/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/toast')>();
  return { ...actual, useToast: () => showToast };
});

import { TodayRoute } from './today';

const incompleteSnapshot: TodaySnapshot = {
  checklists: [
    {
      createdAt: '2026-09-01T00:00:00Z',
      id: 'checklist-1',
      name: 'Відкриття зміни',
      tasks: [
        {
          completion: null,
          id: 'task-2',
          position: 2,
          title: 'Увімкнути музику',
        },
        {
          completion: null,
          id: 'task-1',
          position: 1,
          title: 'Увімкнути світло',
        },
      ],
    },
  ],
  logicalDate: '2026-09-05',
  timezone: 'Europe/Kyiv',
};

function withCompletion(
  snapshot: TodaySnapshot,
  taskId: string,
  completedBy = 'member-2',
): TodaySnapshot {
  return {
    ...snapshot,
    checklists: snapshot.checklists.map((checklist) => ({
      ...checklist,
      tasks: checklist.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completion: {
                completedAt: '2026-09-05T09:07:00.000Z',
                completedBy,
                completedByName: completedBy === 'member-2' ? 'Іван' : 'Олена',
                id: `completion-${taskId}`,
              },
            }
          : task,
      ),
    })),
  };
}

function renderToday() {
  return render(
    <MemoryRouter>
      <TodayRoute />
    </MemoryRouter>,
  );
}

describe('TodayRoute', () => {
  beforeEach(() => {
    api.completeTask.mockReset();
    api.fetchTodaySnapshot.mockReset();
    api.uncompleteTask.mockReset();
    authState.userId = 'member-2';
    realtimeState.retry.mockReset();
    realtimeState.status = 'connected';
    showToast.mockReset();
    teamState.activeTeam = {
      created_at: '2026-09-01T00:00:00Z',
      id: 'team-1',
      name: 'Бар',
      owner_id: 'owner-1',
      timezone: 'Europe/Kyiv',
      updated_at: '2026-09-01T00:00:00Z',
    };
    teamState.status = 'ready';
  });

  it('keeps an authenticated user without a team on Today with a creation path', () => {
    teamState.activeTeam = null;

    renderToday();

    expect(
      screen.getByRole('heading', { name: 'Почніть із команди' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Створити команду' }),
    ).toHaveAttribute('href', '/team');
    expect(api.fetchTodaySnapshot).not.toHaveBeenCalled();
  });

  it('groups tasks in position order and protects another member completion', async () => {
    api.fetchTodaySnapshot.mockResolvedValue(
      withCompletion(incompleteSnapshot, 'task-2', 'member-1'),
    );

    renderToday();

    expect(
      await screen.findByRole('heading', { name: 'Відкриття зміни' }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('checkbox')
        .map((checkbox) => checkbox.getAttribute('aria-label')),
    ).toEqual(['Виконати: Увімкнути світло', 'Виконано: Увімкнути музику']);
    expect(
      screen.getByRole('checkbox', { name: 'Виконано: Увімкнути музику' }),
    ).toBeDisabled();
    expect(screen.getByText('Олена · 12:07')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('optimistically completes and treats already_completed as convergence', async () => {
    let finishMutation: (value: { status: 'already_completed' }) => void = () =>
      undefined;
    api.fetchTodaySnapshot
      .mockResolvedValueOnce(incompleteSnapshot)
      .mockResolvedValueOnce(withCompletion(incompleteSnapshot, 'task-1'));
    api.completeTask.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishMutation = resolve;
        }),
    );

    renderToday();
    const checkbox = await screen.findByRole('checkbox', {
      name: 'Виконати: Увімкнути світло',
    });

    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(api.completeTask).toHaveBeenCalledWith('task-1');

    await act(async () => finishMutation({ status: 'already_completed' }));

    expect(
      await screen.findByRole('checkbox', {
        name: 'Скасувати виконання: Увімкнути світло',
      }),
    ).toBeChecked();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('rolls back a failed uncomplete and exposes a retry action', async () => {
    const completed = withCompletion(incompleteSnapshot, 'task-1');
    api.fetchTodaySnapshot
      .mockResolvedValueOnce(completed)
      .mockResolvedValueOnce(incompleteSnapshot);
    api.uncompleteTask
      .mockRejectedValueOnce(new Error('Мережа недоступна'))
      .mockResolvedValueOnce({ status: 'removed' });

    renderToday();
    const checkbox = await screen.findByRole('checkbox', {
      name: 'Скасувати виконання: Увімкнути світло',
    });

    fireEvent.click(checkbox);

    await waitFor(() => expect(checkbox).toBeChecked());
    expect(showToast).toHaveBeenCalledWith('Мережа недоступна', 'error');

    fireEvent.click(screen.getByRole('button', { name: 'Спробувати ще' }));

    await waitFor(() => expect(api.uncompleteTask).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('checkbox', {
        name: 'Виконати: Увімкнути світло',
      }),
    ).not.toBeChecked();
  });

  it('keeps degraded Realtime nonblocking and retries the connection', async () => {
    realtimeState.status = 'degraded';
    api.fetchTodaySnapshot.mockResolvedValue(incompleteSnapshot);

    renderToday();

    expect(
      await screen.findByText(/Live-оновлення недоступні/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Виконати: Увімкнути світло' }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Підключити' }));
    expect(realtimeState.retry).toHaveBeenCalledOnce();
  });
});
