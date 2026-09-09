import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { renderWithRouter } from '@/test/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  fetchHistory: vi.fn(),
  fetchHistoryFilterOptions: vi.fn(),
}));
const teamState = vi.hoisted(() => ({
  activeTeam: {
    id: 'team-1',
    name: 'Бар',
    owner_id: 'owner-1',
    timezone: 'Europe/Kyiv',
  } as { id: string; name: string; owner_id: string; timezone: string } | null,
  status: 'ready' as 'error' | 'idle' | 'loading' | 'ready',
}));

vi.mock('@/features/history/history-api', () => api);
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

import { HistoryRoute } from './history';

const day = (date: string, taskTitle = 'Закрити зміну') => ({
  date,
  completedCount: 1,
  completions: [
    {
      id: `completion-${date}`,
      taskId: 'task-1',
      taskTitle,
      checklistId: 'checklist-1',
      checklistName: 'Відкриття',
      completedBy: 'user-1',
      completedByName: 'Олена',
      completedAt: '2026-09-05T09:07:00.000Z',
    },
  ],
  missedCount: 0,
  missed: [] as {
    taskId: string;
    taskTitle: string;
    checklistId: string;
    checklistName: string;
  }[],
});
const missedTask = (taskId: string, taskTitle: string) => ({
  taskId,
  taskTitle,
  checklistId: 'checklist-1',
  checklistName: 'Відкриття',
});
const snapshot = (
  days = [day('2026-09-05')],
  extra: Partial<Record<string, unknown>> = {},
) => ({
  logicalToday: '2026-09-06',
  fromDate: '2026-08-24',
  toDate: '2026-09-06',
  days,
  hasMore: false,
  nextBeforeDate: null,
  ...extra,
});

function renderHistory() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderWithRouter({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <HistoryRoute />
      </QueryClientProvider>
    ),
    path: '/history',
  });
}

describe('HistoryRoute', () => {
  beforeEach(() => {
    api.fetchHistory.mockReset();
    api.fetchHistoryFilterOptions.mockReset();
    api.fetchHistoryFilterOptions.mockResolvedValue({
      checklists: [{ id: 'checklist-1', name: 'Відкриття', archived: true }],
      users: [{ id: 'user-1', displayName: 'Олена', currentMember: false }],
    });
    teamState.activeTeam = {
      id: 'team-1',
      name: 'Бар',
      owner_id: 'owner-1',
      timezone: 'Europe/Kyiv',
    };
    teamState.status = 'ready';
  });

  it('renders static accessible statuses and counts missed tasks in the day total', async () => {
    api.fetchHistory.mockResolvedValue(
      snapshot([
        {
          ...day('2026-09-05'),
          missedCount: 2,
          missed: [
            missedTask('task-2', 'Помити шейкери'),
            missedTask('task-3', 'Замовити лід'),
          ],
        },
      ]),
    );
    renderHistory();
    expect(await screen.findByText('Закрити зміну')).toBeInTheDocument();
    expect(screen.getByText('Не виконано')).toBeInTheDocument();
    expect(screen.getByText('Помити шейкери')).toBeInTheDocument();
    expect(screen.getByText('Замовити лід')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    const completedStatuses = screen.getAllByRole('img', {
      name: 'Виконано',
    });
    const missedStatuses = screen.getAllByRole('img', { name: 'Не виконано' });
    expect(completedStatuses).toHaveLength(1);
    expect(missedStatuses).toHaveLength(2);
    expect(completedStatuses[0]).toHaveClass(
      'status',
      'status-primary',
      'status-md',
    );
    expect(missedStatuses[0]).toHaveClass(
      'status',
      'status-neutral',
      'status-md',
    );
    expect(
      screen.queryByRole('button', { name: 'Виконано' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('renders a day that only has missed tasks', async () => {
    api.fetchHistory.mockResolvedValue(
      snapshot([
        {
          date: '2026-09-04',
          completedCount: 0,
          completions: [],
          missedCount: 1,
          missed: [missedTask('task-2', 'Помити шейкери')],
        },
      ]),
    );
    renderHistory();
    expect(await screen.findByText('Помити шейкери')).toBeInTheDocument();
    expect(screen.queryByText('Історія порожня')).not.toBeInTheDocument();
    expect(screen.getByText('0 / 1')).toBeInTheDocument();
    expect(screen.getAllByRole('list')).toHaveLength(1);
    expect(
      screen.getByRole('img', { name: 'Не виконано' }),
    ).toBeInTheDocument();
  });

  it('omits the missed section for days without missed tasks', async () => {
    api.fetchHistory.mockResolvedValue(snapshot());
    renderHistory();
    expect(await screen.findByText('Закрити зміну')).toBeInTheDocument();
    expect(screen.queryByText('Не виконано')).not.toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Виконано' })).toBeInTheDocument();
  });

  it('loads defaults, derives the 14-day dates, and renders localized details', async () => {
    api.fetchHistory.mockResolvedValue(snapshot());
    renderHistory();
    expect(await screen.findByText('Закрити зміну')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Фільтри історії' }));
    expect(screen.getByLabelText('Від дати')).toHaveValue('2026-08-24');
    expect(screen.getByLabelText('До дати')).toHaveValue('2026-09-06');
    expect(screen.getByText(/Відкриття · Олена/)).toBeInTheDocument();
    expect(screen.getByText(/12:07/)).toBeInTheDocument();
    expect(api.fetchHistory).toHaveBeenCalledWith(
      'team-1',
      expect.objectContaining({ beforeDate: null }),
    );
  });

  it('applies filters and marks archived/former options', async () => {
    api.fetchHistory.mockResolvedValue(snapshot());
    renderHistory();
    await screen.findByText('Закрити зміну');
    fireEvent.click(screen.getByRole('button', { name: 'Фільтри історії' }));
    expect(
      screen.getByRole('option', { name: 'Відкриття (архівний)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Олена (колишній учасник)' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Чекліст'), {
      target: { value: 'checklist-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Застосувати' }));
    await waitFor(() =>
      expect(api.fetchHistory).toHaveBeenLastCalledWith(
        'team-1',
        expect.objectContaining({
          checklistId: 'checklist-1',
          beforeDate: null,
        }),
      ),
    );
    expect(document.querySelector('.badge')).toHaveTextContent('1');
  });

  it('resets filters, appends a whole next day, and avoids duplicate days', async () => {
    api.fetchHistory
      .mockResolvedValueOnce(
        snapshot([day('2026-09-05')], {
          hasMore: true,
          nextBeforeDate: '2026-09-05',
        }),
      )
      .mockResolvedValueOnce(
        snapshot([day('2026-09-04', 'Порахувати касу')], { hasMore: false }),
      );
    renderHistory();
    await screen.findByText('Закрити зміну');
    fireEvent.click(screen.getByRole('button', { name: 'Завантажити ще' }));
    expect(await screen.findByText('Порахувати касу')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Фільтри історії' }));
    fireEvent.click(screen.getByRole('button', { name: 'Скинути' }));
    await waitFor(() =>
      expect(api.fetchHistory).toHaveBeenLastCalledWith(
        'team-1',
        expect.objectContaining({
          fromDate: '2026-08-24',
          toDate: '2026-09-06',
          beforeDate: null,
        }),
      ),
    );
  });

  it('distinguishes no history and filtered empty results', async () => {
    api.fetchHistory.mockResolvedValueOnce(snapshot([]));
    renderHistory();
    expect(await screen.findByText('Історія порожня')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Фільтри історії' }));
    fireEvent.change(screen.getByLabelText('Учасник'), {
      target: { value: 'user-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Застосувати' }));
    expect(await screen.findByText('Нічого не знайдено')).toBeInTheDocument();
  });

  it('renders permission, general error retry, and option-load warning states', async () => {
    api.fetchHistory.mockRejectedValueOnce({ code: '42501' });
    api.fetchHistoryFilterOptions.mockRejectedValueOnce(
      new Error('Фільтри недоступні'),
    );
    renderHistory();
    expect(await screen.findByText(/немає доступу/)).toBeInTheDocument();
    api.fetchHistory.mockResolvedValue(snapshot());
    fireEvent.click(screen.getByRole('button', { name: 'Повторити' }));
    expect(await screen.findByText('Закрити зміну')).toBeInTheDocument();

    api.fetchHistory.mockRejectedValueOnce(new Error('Мережа недоступна'));
    fireEvent.click(screen.getByRole('button', { name: 'Фільтри історії' }));
    fireEvent.click(screen.getByRole('button', { name: 'Застосувати' }));
    expect(await screen.findByText('Мережа недоступна')).toBeInTheDocument();
  });

  it('provides accessible filter controls and closes the Sheet', async () => {
    api.fetchHistory.mockResolvedValue(snapshot());
    renderHistory();
    await screen.findByText('Закрити зміну');
    const trigger = screen.getByRole('button', { name: 'Фільтри історії' });
    fireEvent.click(trigger);
    expect(
      screen.getByRole('dialog', { name: 'Фільтри історії' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Від дати')).toHaveAttribute(
      'max',
      '2026-09-06',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Закрити' }));
    expect(
      screen.queryByRole('dialog', { name: 'Фільтри історії' }),
    ).not.toBeInTheDocument();
  });

  it('shows a non-blocking warning when filter options fail', async () => {
    api.fetchHistory.mockResolvedValue(snapshot());
    api.fetchHistoryFilterOptions.mockRejectedValueOnce(
      new Error('Фільтри недоступні'),
    );
    renderHistory();
    expect(await screen.findByText('Фільтри недоступні')).toBeInTheDocument();
    expect(screen.getByText('Закрити зміну')).toBeInTheDocument();
  });

  it('clears a superseded load-more state when filters reload', async () => {
    let resolveMore: ((value: ReturnType<typeof snapshot>) => void) | undefined;
    let resolveFilter:
      ((value: ReturnType<typeof snapshot>) => void) | undefined;
    api.fetchHistory
      .mockResolvedValueOnce(
        snapshot([day('2026-09-05')], {
          hasMore: true,
          nextBeforeDate: '2026-09-05',
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveMore = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFilter = resolve;
          }),
      );
    renderHistory();
    await screen.findByText('Закрити зміну');
    fireEvent.click(screen.getByRole('button', { name: 'Завантажити ще' }));
    fireEvent.click(screen.getByRole('button', { name: 'Фільтри історії' }));
    fireEvent.click(screen.getByRole('button', { name: 'Застосувати' }));
    resolveFilter?.(snapshot([day('2026-09-03', 'Фільтрований день')]));
    await screen.findByText('Фільтрований день');
    expect(
      screen.queryByRole('button', { name: 'Завантажити ще' }),
    ).not.toBeInTheDocument();
    resolveMore?.(snapshot([day('2026-09-04', 'Застаріла сторінка')]));
    await waitFor(() =>
      expect(screen.queryByText('Застаріла сторінка')).not.toBeInTheDocument(),
    );
  });

  it('allows only one rapid load-more request while one page is in flight', async () => {
    let resolveMore: ((value: ReturnType<typeof snapshot>) => void) | undefined;
    api.fetchHistory
      .mockResolvedValueOnce(
        snapshot([day('2026-09-05')], {
          hasMore: true,
          nextBeforeDate: '2026-09-05',
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveMore = resolve;
          }),
      );
    renderHistory();
    await screen.findByText('Закрити зміну');
    const loadMore = screen.getByRole('button', { name: 'Завантажити ще' });
    fireEvent.click(loadMore);
    fireEvent.click(loadMore);
    expect(api.fetchHistory).toHaveBeenCalledTimes(2);
    resolveMore?.(snapshot([day('2026-09-04', 'Попередній день')]));
    expect(await screen.findByText('Попередній день')).toBeInTheDocument();
  });

  it('does not keep showing the previous team data while the new team loads (P1-1)', async () => {
    let resolveTeam2:
      ((value: ReturnType<typeof snapshot>) => void) | undefined;
    api.fetchHistory
      .mockResolvedValueOnce(snapshot([day('2026-09-05', 'Задача команди 1')]))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveTeam2 = resolve;
          }),
      );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapped = () => (
      <QueryClientProvider client={queryClient}>
        <HistoryRoute />
      </QueryClientProvider>
    );
    const { rerender } = render(<Wrapped />);
    expect(await screen.findByText('Задача команди 1')).toBeInTheDocument();

    teamState.activeTeam = {
      id: 'team-2',
      name: 'Інший бар',
      owner_id: 'owner-2',
      timezone: 'Europe/Kyiv',
    };
    rerender(<Wrapped />);

    // The old team's completions must not linger under the new team while
    // the new team's history is still loading.
    await waitFor(() =>
      expect(screen.queryByText('Задача команди 1')).not.toBeInTheDocument(),
    );

    resolveTeam2?.(snapshot([day('2026-09-04', 'Задача команди 2')]));
    expect(await screen.findByText('Задача команди 2')).toBeInTheDocument();
    expect(api.fetchHistory).toHaveBeenLastCalledWith(
      'team-2',
      expect.objectContaining({ beforeDate: null }),
    );
  });

  it('resets active filters when the team changes (P2-3)', async () => {
    api.fetchHistory.mockResolvedValue(snapshot());
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapped = () => (
      <QueryClientProvider client={queryClient}>
        <HistoryRoute />
      </QueryClientProvider>
    );
    const { rerender } = render(<Wrapped />);
    await screen.findByText('Закрити зміну');
    fireEvent.click(screen.getByRole('button', { name: 'Фільтри історії' }));
    fireEvent.change(screen.getByLabelText('Чекліст'), {
      target: { value: 'checklist-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Застосувати' }));
    await waitFor(() =>
      expect(document.querySelector('.badge')).toHaveTextContent('1'),
    );

    teamState.activeTeam = {
      id: 'team-2',
      name: 'Інший бар',
      owner_id: 'owner-2',
      timezone: 'Europe/Kyiv',
    };
    rerender(<Wrapped />);

    await waitFor(() =>
      expect(api.fetchHistory).toHaveBeenLastCalledWith(
        'team-2',
        expect.objectContaining({ checklistId: null, userId: null }),
      ),
    );
    expect(document.querySelector('.badge')).not.toBeInTheDocument();
  });
});
