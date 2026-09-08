import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const auth = vi.hoisted(() => ({ userId: 'user-1' }));
const fetchTeams = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    configIssue: null,
    session: { user: { id: auth.userId } },
  }),
}));
vi.mock('./team-api', async (original) => ({
  ...(await original<typeof import('./team-api')>()),
  fetchTeams,
}));
vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    channel: () => ({ on: () => ({ on: () => ({ subscribe: () => ({}) }) }) }),
    removeChannel: vi.fn(),
  }),
}));

import { TeamProvider, useTeams } from './team-context';

const team = (id: string) => ({
  created_at: '2026-01-01T00:00:00Z',
  id,
  name: id,
  owner_id: 'user-1',
  timezone: 'UTC',
  updated_at: '2026-01-01T00:00:00Z',
});

function Probe() {
  const { activeTeam, refreshTeams, status } = useTeams();
  return (
    <>
      <output>{`${status}:${activeTeam?.id ?? 'none'}`}</output>
      <button onClick={() => void refreshTeams()} type="button">
        refresh
      </button>
    </>
  );
}
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <TeamProvider>
        <Probe />
      </TeamProvider>
    </QueryClientProvider>,
  );
}

describe('TeamProvider active-team resolution', () => {
  beforeEach(() => {
    fetchTeams.mockReset();
    localStorage.clear();
    auth.userId = 'user-1';
  });
  it('uses a stored team after the initial query resolves', async () => {
    localStorage.setItem('checklister.active-team.user-1', 'b');
    fetchTeams.mockResolvedValue([team('a'), team('b')]);
    mount();
    await waitFor(() =>
      expect(screen.getByText('ready:b')).toBeInTheDocument(),
    );
  });
  it('uses and persists the deterministic first fallback without stored state', async () => {
    fetchTeams.mockResolvedValue([team('a'), team('b')]);
    mount();
    await waitFor(() =>
      expect(screen.getByText('ready:a')).toBeInTheDocument(),
    );
    expect(localStorage.getItem('checklister.active-team.user-1')).toBe('a');
  });
  it('falls back when storage contains a stale team id', async () => {
    localStorage.setItem('checklister.active-team.user-1', 'missing');
    fetchTeams.mockResolvedValue([team('a')]);
    mount();
    await waitFor(() =>
      expect(screen.getByText('ready:a')).toBeInTheDocument(),
    );
  });
  it('selects a remaining fallback after active-team removal', async () => {
    localStorage.setItem('checklister.active-team.user-1', 'a');
    fetchTeams
      .mockResolvedValueOnce([team('a'), team('b')])
      .mockResolvedValueOnce([team('b')]);
    mount();
    await waitFor(() =>
      expect(screen.getByText('ready:a')).toBeInTheDocument(),
    );
    screen.getByRole('button', { name: 'refresh' }).click();
    await waitFor(() =>
      expect(screen.getByText('ready:b')).toBeInTheDocument(),
    );
    expect(localStorage.getItem('checklister.active-team.user-1')).toBe('b');
  });
  it('does not reuse another user session cache or selection', async () => {
    localStorage.setItem('checklister.active-team.user-1', 'a');
    localStorage.setItem('checklister.active-team.user-2', 'b');
    fetchTeams
      .mockResolvedValueOnce([team('a')])
      .mockResolvedValueOnce([team('b')]);
    const view = mount();
    await waitFor(() =>
      expect(screen.getByText('ready:a')).toBeInTheDocument(),
    );
    auth.userId = 'user-2';
    view.rerender(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <TeamProvider>
          <Probe />
        </TeamProvider>
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('ready:b')).toBeInTheDocument(),
    );
  });
});
