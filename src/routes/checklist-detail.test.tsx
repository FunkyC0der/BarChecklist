import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '@/test/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui';
import type { Task } from '@/features/checklists/checklist-api';

const api = vi.hoisted(() => ({
  createTask: vi.fn(),
  deleteChecklist: vi.fn(),
  deleteTask: vi.fn(),
  fetchChecklist: vi.fn(),
  fetchTasks: vi.fn(),
  reorderTasks: vi.fn(),
  updateChecklist: vi.fn(),
  updateTask: vi.fn(),
}));
const teamState = vi.hoisted(() => ({
  activeTeam: { id: 'team-1', owner_id: 'owner-1' } as {
    id: string;
    owner_id: string;
  } | null,
  status: 'ready' as 'error' | 'idle' | 'loading' | 'ready',
}));

vi.mock('@/features/checklists/checklist-api', () => api);
vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ session: { user: { id: 'owner-1' } } }),
}));
vi.mock('@/features/teams/team-context', () => ({
  useTeams: () => teamState,
}));

// The real SortableTaskList drags via @dnd-kit pointer sensors, which
// aren't worth simulating here. Stub it with a button that lets the test
// trigger onReorder directly, the same way the page's real drag handler
// would call it.
vi.mock('@/features/checklists/sortable-task-list', () => ({
  SortableTaskList: ({
    onReorder,
    onSelect,
    tasks,
  }: {
    onReorder: (ids: string[]) => Promise<void>;
    onSelect?: (task: Task, element: HTMLElement) => void;
    tasks: Task[];
  }) => (
    <div>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <button
              onClick={(event) => onSelect?.(task, event.currentTarget)}
              type="button"
            >
              {task.title}
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          // The real SortableTaskList catches (and rolls back on) a
          // rejected onReorder itself; mirror that here so this stub
          // doesn't produce an unhandled rejection from the deliberate
          // rethrow in ChecklistDetailRoute's handleReorder.
          onReorder([...tasks].reverse().map((task) => task.id)).catch(
            () => undefined,
          );
        }}
        type="button"
      >
        Reorder
      </button>
    </div>
  ),
}));

import { ChecklistDetailRoute } from './checklist-detail';

const checklist = {
  archived_at: null,
  created_at: '2026-01-01T00:00:00Z',
  created_by: 'owner-1',
  deleted_at: null,
  id: 'checklist-1',
  name: 'Відкриття',
  team_id: 'team-1',
  updated_at: '2026-01-01T00:00:00Z',
};
const tasks: Task[] = [
  {
    cadence: 'daily',
    checklist_id: 'checklist-1',
    created_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    id: 'task-1',
    position: 0,
    title: 'Перша задача',
    updated_at: '2026-01-01T00:00:00Z',
    weekdays: [],
  },
  {
    cadence: 'daily',
    checklist_id: 'checklist-1',
    created_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    id: 'task-2',
    position: 1,
    title: 'Друга задача',
    updated_at: '2026-01-01T00:00:00Z',
    weekdays: [],
  },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderRoute() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    ...renderWithRouter({
      component: () => (
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ChecklistDetailRoute />
          </ToastProvider>
        </QueryClientProvider>
      ),
      initialPath: '/checklists/checklist-1',
      path: '/checklists/$checklistId',
    }),
  };
}

describe('ChecklistDetailRoute', () => {
  beforeEach(() => {
    api.fetchChecklist.mockReset();
    api.fetchTasks.mockReset();
    api.reorderTasks.mockReset();
    teamState.activeTeam = { id: 'team-1', owner_id: 'owner-1' };
    teamState.status = 'ready';
  });

  it('shows a retriable error, not "not found", when the load fails (P1-2)', async () => {
    api.fetchChecklist.mockRejectedValueOnce(new Error('Мережа недоступна'));
    renderRoute();

    expect(await screen.findByText('Мережа недоступна')).toBeInTheDocument();
    expect(screen.queryByText('Чекліст не знайдено')).not.toBeInTheDocument();

    api.fetchChecklist.mockResolvedValue(checklist);
    api.fetchTasks.mockResolvedValue(tasks);
    fireEvent.click(screen.getByRole('button', { name: 'Повторити' }));

    expect(await screen.findByText('Перша задача')).toBeInTheDocument();
  });

  it('still shows "not found" when the checklist truly does not exist', async () => {
    api.fetchChecklist.mockResolvedValueOnce(null);
    renderRoute();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Чекліст не знайдено',
      }),
    ).toBeInTheDocument();
  });

  it('restores focus to the stable account trigger for a menu-originated checklist delete', async () => {
    api.fetchChecklist.mockResolvedValue(checklist);
    api.fetchTasks.mockResolvedValue(tasks);
    renderRoute();
    await screen.findByText('Перша задача');

    const accountTrigger = document.createElement('button');
    document.body.append(accountTrigger);
    accountTrigger.focus();
    window.dispatchEvent(
      new CustomEvent('checklister:delete-checklist', {
        detail: { trigger: accountTrigger },
      }),
    );

    expect(
      await screen.findByRole('dialog', { name: 'Видалити чекліст?' }),
    ).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(accountTrigger).toHaveFocus());
    accountTrigger.remove();
  });

  it('opens the task actions menu from the edit sheet', async () => {
    api.fetchChecklist.mockResolvedValue(checklist);
    api.fetchTasks.mockResolvedValue(tasks);
    renderRoute();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Перша задача' }),
    );
    expect(
      await screen.findByRole('dialog', { name: 'Редагувати задачу' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ще' }));
    expect(
      await screen.findByRole('menuitem', { name: 'Видалити задачу' }),
    ).toBeVisible();
  });

  it('keeps the task list mounted and shows an inline alert on a failed reorder (P1-3)', async () => {
    api.fetchChecklist.mockResolvedValue(checklist);
    api.fetchTasks.mockResolvedValue(tasks);
    api.reorderTasks.mockRejectedValueOnce(new Error('Не вдалося'));
    const { queryClient } = renderRoute();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await screen.findByText('Перша задача');
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));

    expect(await screen.findByText('Не вдалося')).toBeInTheDocument();
    // The page, task list, and FAB must survive a reorder failure — only
    // a query-load failure should replace the whole page.
    expect(screen.getByText('Перша задача')).toBeInTheDocument();
    expect(screen.getByText('Друга задача')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Додати задачу' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(api.fetchChecklist).toHaveBeenCalledTimes(2));
    expect(invalidateQueries).toHaveBeenCalledTimes(5);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['checklist', 'team-1', 'checklist-1'],
    });
  });

  it('keeps the task list mounted when the post-reorder refetch also fails (P1-A)', async () => {
    // Offline drag: the reorder rejects, handleReorder's `finally`
    // invalidates the detail query, and the refetch rejects too. The query
    // then reports `status: "error"` while still holding its previous data,
    // which must NOT tear the page down.
    api.fetchChecklist.mockResolvedValueOnce(checklist);
    api.fetchChecklist.mockRejectedValue(new Error('Мережа недоступна'));
    api.fetchTasks.mockResolvedValue(tasks);
    api.reorderTasks.mockRejectedValueOnce(new Error('Не вдалося'));
    renderRoute();

    await screen.findByText('Перша задача');
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));

    expect(await screen.findByText('Не вдалося')).toBeInTheDocument();
    await waitFor(() => expect(api.fetchChecklist).toHaveBeenCalledTimes(2));

    // The failed refetch surfaces as an inline alert next to the reorder
    // alert, not as the full-page error screen.
    expect(await screen.findByText('Мережа недоступна')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Відкриття' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Перша задача')).toBeInTheDocument();
    expect(screen.getByText('Друга задача')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Додати задачу' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Не вдалося')).toBeInTheDocument();
  });
});
