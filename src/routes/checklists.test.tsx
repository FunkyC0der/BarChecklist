import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui';

const api = vi.hoisted(() => ({
  createChecklist: vi.fn(),
  fetchActiveTaskCounts: vi.fn(),
  fetchChecklists: vi.fn(),
}));
const teamState = vi.hoisted(() => ({
  activeTeam: {
    id: 'team-1',
    owner_id: 'owner-1',
  } as { id: string; owner_id: string } | null,
  status: 'ready' as 'error' | 'idle' | 'loading' | 'ready',
}));

vi.mock('@/features/checklists/checklist-api', () => ({
  ...api,
}));
vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ session: { user: { id: 'owner-1' } } }),
}));
vi.mock('@/features/teams/team-context', () => ({
  useTeams: () => teamState,
}));

import { ChecklistsRoute } from './checklists';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(
    this: HTMLDialogElement,
  ) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function close(
    this: HTMLDialogElement,
  ) {
    this.open = false;
  });
});

function renderRoute() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/checklists']}>
        <Routes>
          <Route element={<ChecklistsRoute />} path="/checklists" />
          <Route
            element={<div>Нова сторінка чекліста</div>}
            path="/checklists/:checklistId"
          />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('ChecklistsRoute', () => {
  beforeEach(() => {
    api.createChecklist.mockReset();
    api.fetchActiveTaskCounts.mockReset();
    api.fetchChecklists.mockReset();
    api.fetchActiveTaskCounts.mockResolvedValue(new Map());
    api.fetchChecklists.mockResolvedValue([]);
    teamState.activeTeam = { id: 'team-1', owner_id: 'owner-1' };
    teamState.status = 'ready';
  });

  it('opens a newly created checklist immediately', async () => {
    api.createChecklist.mockResolvedValue({ id: 'checklist-new' });
    renderRoute();

    await screen.findByRole('heading', { name: 'Чеклістів поки немає' });
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Створити чекліст' })[0]!,
    );
    fireEvent.change(screen.getByLabelText('Назва чекліста'), {
      target: { value: 'Відкриття зміни' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Створити' }));

    expect(
      await screen.findByText('Нова сторінка чекліста'),
    ).toBeInTheDocument();
    expect(api.createChecklist).toHaveBeenCalledWith({
      createdBy: 'owner-1',
      name: 'Відкриття зміни',
      teamId: 'team-1',
    });
  });

  it('shows a Team CTA instead of loading forever without membership', async () => {
    teamState.activeTeam = null;
    renderRoute();

    expect(
      screen.getByRole('heading', { name: 'Команди ще немає' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Створити команду' }),
    ).toHaveAttribute('href', '/team');
    await waitFor(() => expect(api.fetchChecklists).not.toHaveBeenCalled());
  });
});
