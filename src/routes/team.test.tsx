import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui';

const teamOne = {
  created_at: '2026-09-01T00:00:00Z',
  id: 'team-1',
  name: 'Бар Один',
  owner_id: 'user-1',
  timezone: 'Europe/Kyiv',
  updated_at: '2026-09-01T00:00:00Z',
};
const teamTwo = {
  created_at: '2026-09-02T00:00:00Z',
  id: 'team-2',
  name: 'Бар Два',
  owner_id: 'user-1',
  timezone: 'UTC',
  updated_at: '2026-09-02T00:00:00Z',
};
const api = vi.hoisted(() => ({
  createTeam: vi.fn(),
  createTeamInvite: vi.fn(),
  fetchCurrentTeamInvite: vi.fn(),
  fetchTeamMembers: vi.fn(),
  updateTeam: vi.fn(),
}));
const refreshTeams = vi.hoisted(() => vi.fn());
const shareLink = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());
const teamState = vi.hoisted(() => ({
  activeTeam: null as typeof teamOne | null,
  error: null as string | null,
  selectTeam: vi.fn(),
  status: 'ready' as 'error' | 'idle' | 'loading' | 'ready',
  teams: [] as (typeof teamOne)[],
}));

const member = (teamId: string, userId: string, displayName: string) => ({
  displayName,
  joined_at: '2026-09-01T00:00:00Z',
  team_id: teamId,
  user_id: userId,
});

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    session: { user: { email: 'new@example.com', id: 'user-1' } },
    signOut,
  }),
}));
vi.mock('@/features/teams/team-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/teams/team-api')>()),
  createTeam: api.createTeam,
  createTeamInvite: api.createTeamInvite,
  fetchCurrentTeamInvite: api.fetchCurrentTeamInvite,
  fetchTeamMembers: api.fetchTeamMembers,
  updateTeam: api.updateTeam,
}));
vi.mock('@/features/teams/team-context', () => ({
  useTeams: () => ({ ...teamState, refreshTeams }),
}));
vi.mock('@/features/teams/use-team-realtime', () => ({
  useTeamRealtime: () => ({ retry: vi.fn(), status: 'connected' }),
}));
vi.mock('@/lib/platform', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/platform')>()),
  shareLink,
}));

import { TeamRoute } from './team';

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

function renderTeam() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <TeamRoute />
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('TeamRoute', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    refreshTeams.mockReset();
    shareLink.mockReset();
    signOut.mockReset();
    teamState.selectTeam.mockReset();
    teamState.activeTeam = null;
    teamState.error = null;
    teamState.status = 'ready';
    teamState.teams = [];
    api.createTeam.mockResolvedValue(undefined);
    api.fetchCurrentTeamInvite.mockResolvedValue(null);
    api.fetchTeamMembers.mockResolvedValue([]);
    api.updateTeam.mockResolvedValue(undefined);
    refreshTeams.mockImplementation(async (preferredTeamId?: string) => {
      if (preferredTeamId) {
        teamState.activeTeam =
          teamState.teams.find((team) => team.id === preferredTeamId) ?? null;
      }
      return teamState.teams;
    });
  });

  it('offers first-team creation and refreshes the post-insert membership', async () => {
    refreshTeams.mockResolvedValue([
      {
        ...teamOne,
        name: 'Нова команда',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
    ]);
    renderTeam();

    expect(
      screen.getByRole('heading', { name: 'Створіть команду' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Назва команди'), {
      target: { value: 'Нова команда' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Створити команду' }));

    await waitFor(() => {
      expect(api.createTeam).toHaveBeenCalledWith({
        name: 'Нова команда',
        ownerId: 'user-1',
        timezone: expect.any(String),
      });
      expect(refreshTeams).toHaveBeenNthCalledWith(1);
      expect(refreshTeams).toHaveBeenNthCalledWith(2, 'team-1');
    });
  });

  it('shows the active team settings without an inline team selector', async () => {
    teamState.activeTeam = teamOne;
    teamState.teams = [teamOne, teamTwo];
    renderTeam();

    await waitFor(() =>
      expect(api.fetchTeamMembers).toHaveBeenCalledWith('team-1'),
    );

    expect(
      screen.queryByRole('combobox', { name: 'Поточна команда' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Команда' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Налаштування команди' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Бар Один')).toBeInTheDocument();
    expect(screen.getByText('Europe/Kyiv')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Видалити команду' }),
    ).toBeInTheDocument();
  });

  it('does not let a stale member request overwrite the selected team', async () => {
    let resolveOldMembers:
      ((members: ReturnType<typeof member>[]) => void) | undefined;
    api.fetchTeamMembers.mockImplementation((teamId: string) => {
      if (teamId === 'team-1') {
        return new Promise((resolve) => {
          resolveOldMembers = resolve;
        });
      }
      return Promise.resolve([member('team-2', 'user-2', 'Учасник Два')]);
    });
    teamState.activeTeam = teamOne;
    teamState.teams = [teamOne, teamTwo];
    const view = renderTeam();
    await waitFor(() =>
      expect(api.fetchTeamMembers).toHaveBeenCalledWith('team-1'),
    );

    // The popup calls selectTeam; update the mocked context as that callback
    // would, then rerender the route with the newly selected team.
    teamState.activeTeam = teamTwo;
    view.rerender(
      <ToastProvider>
        <MemoryRouter>
          <TeamRoute />
        </MemoryRouter>
      </ToastProvider>,
    );
    expect(await screen.findByText('Учасник Два')).toBeInTheDocument();

    await act(async () => {
      resolveOldMembers?.([member('team-1', 'user-1', 'Старий учасник')]);
    });
    expect(screen.queryByText('Старий учасник')).not.toBeInTheDocument();
  });

  it('places the circular invite generator beside Members and announces clipboard fallback', async () => {
    const token = 'a'.repeat(64);
    teamState.activeTeam = teamOne;
    teamState.teams = [teamOne];
    api.createTeamInvite.mockResolvedValue({
      expires_at: '2026-09-07T15:00:00.000Z',
      token,
    });
    shareLink.mockResolvedValue('copied');
    renderTeam();

    await waitFor(() =>
      expect(api.fetchTeamMembers).toHaveBeenCalledWith('team-1'),
    );

    const heading = screen.getByRole('heading', { name: 'Учасники' });
    const inviteButton = screen.getByRole('button', {
      name: 'Створити запрошення',
    });
    expect(inviteButton).toHaveClass('btn', 'btn-circle', 'btn-sm');
    expect(heading.parentElement?.children[1]).toBe(inviteButton);
    fireEvent.click(inviteButton);

    const dialog = await screen.findByRole('dialog', {
      name: 'Запрошення до команди',
    });
    expect(dialog).not.toHaveTextContent(token);
    fireEvent.click(screen.getByRole('button', { name: 'Поділитися' }));

    expect(await screen.findByText('Посилання скопійовано.')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(shareLink).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining(token) }),
    );
  });

  it('edits team name and timezone through independent dialogs', async () => {
    teamState.activeTeam = teamOne;
    teamState.teams = [teamOne];
    renderTeam();

    await waitFor(() =>
      expect(api.fetchTeamMembers).toHaveBeenCalledWith('team-1'),
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Редагувати назву команди' }),
    );
    const nameDialog = await screen.findByRole('dialog', {
      name: 'Редагувати назву команди',
    });
    expect(
      within(nameDialog).getByDisplayValue('Бар Один'),
    ).toBeInTheDocument();
    fireEvent.change(within(nameDialog).getByLabelText('Назва'), {
      target: { value: 'Бар Новий' },
    });
    fireEvent.click(
      within(nameDialog).getByRole('button', { name: 'Зберегти' }),
    );

    await waitFor(() =>
      expect(api.updateTeam).toHaveBeenCalledWith('team-1', {
        name: 'Бар Новий',
        timezone: 'Europe/Kyiv',
      }),
    );
    expect(
      screen.queryByRole('dialog', { name: 'Редагувати назву команди' }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Редагувати часовий пояс' }),
    );
    const timezoneDialog = await screen.findByRole('dialog', {
      name: 'Редагувати часовий пояс',
    });
    fireEvent.change(within(timezoneDialog).getByLabelText('Timezone'), {
      target: { value: 'UTC' },
    });
    fireEvent.click(
      within(timezoneDialog).getByRole('button', { name: 'Скасувати' }),
    );
    expect(api.updateTeam).toHaveBeenCalledOnce();
  });

  it('keeps cancellation quiet and announces genuine share errors', async () => {
    teamState.activeTeam = teamOne;
    teamState.teams = [teamOne];
    api.createTeamInvite.mockResolvedValue({
      expires_at: '2026-09-07T15:00:00.000Z',
      token: 'b'.repeat(64),
    });
    shareLink.mockRejectedValueOnce(
      new DOMException('Cancelled', 'AbortError'),
    );
    renderTeam();
    await waitFor(() =>
      expect(api.fetchTeamMembers).toHaveBeenCalledWith('team-1'),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Створити запрошення' }),
    );
    await screen.findByRole('dialog', { name: 'Запрошення до команди' });
    fireEvent.click(screen.getByRole('button', { name: 'Поділитися' }));
    await waitFor(() => expect(shareLink).toHaveBeenCalledOnce());
    expect(
      screen.queryByText('Не вдалося поділитися запрошенням.'),
    ).not.toBeInTheDocument();

    shareLink.mockRejectedValueOnce(new Error('Share failed'));
    fireEvent.click(screen.getByRole('button', { name: 'Поділитися' }));
    expect(
      await screen.findByText('Не вдалося поділитися запрошенням.'),
    ).toHaveAttribute('aria-live', 'polite');
  });
});
