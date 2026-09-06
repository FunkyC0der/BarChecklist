import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  fetchHistory: vi.fn(),
  fetchHistoryFilterOptions: vi.fn(),
}));

vi.mock('@/features/history/history-api', () => api);
vi.mock('@/features/teams/team-context', () => ({
  useTeams: () => ({
    activeTeam: {
      id: 'team-1',
      name: 'Бар',
      owner_id: 'owner-1',
      timezone: 'Europe/Kyiv',
    },
    status: 'ready',
  }),
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
  return render(
    <MemoryRouter>
      <HistoryRoute />
    </MemoryRouter>,
  );
}

describe('HistoryRoute', () => {
  beforeEach(() => {
    api.fetchHistory.mockReset();
    api.fetchHistoryFilterOptions.mockReset();
    api.fetchHistoryFilterOptions.mockResolvedValue({
      checklists: [{ id: 'checklist-1', name: 'Відкриття', archived: true }],
      users: [{ id: 'user-1', displayName: 'Олена', currentMember: false }],
    });
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
});
