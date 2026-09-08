import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const teamState = vi.hoisted(() => ({
  activeTeam: null as { id: string; owner_id: string } | null,
  selectTeam: vi.fn(),
  status: 'ready' as 'error' | 'idle' | 'loading' | 'ready',
  teams: [] as Array<{ id: string; owner_id: string }>,
}));
const mounts = vi.hoisted(() => ({ count: 0 }));

vi.mock('@/features/auth/auth-context', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    initializationError: null,
    initialized: true,
    retrySessionInitialization: vi.fn(),
    session: { user: { id: 'user-1' } },
    signOut: vi.fn(),
  }),
}));
vi.mock('@/features/teams/team-context', () => ({
  TeamProvider: ({ children }: { children: ReactNode }) => children,
  useTeams: () => teamState,
}));

// Count mounts of the *real* AppLayout without changing how src/app.tsx
// wires it.
vi.mock('./app-layout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./app-layout')>();
  return {
    ...actual,
    AppLayout: ({ children }: { children?: ReactNode }) => {
      useEffect(() => {
        mounts.count += 1;
      }, []);
      return <actual.AppLayout>{children}</actual.AppLayout>;
    },
  };
});

// Leaf content is irrelevant here; the subject is the shell wiring.
vi.mock('./today', () => ({ TodayRoute: () => <div>Today content</div> }));
vi.mock('./checklists', () => ({
  ChecklistsRoute: () => <div>Checklists content</div>,
}));
vi.mock('./history', () => ({
  HistoryRoute: () => <div>History content</div>,
}));
// Also keeps @dnd-kit (which needs ResizeObserver) out of this suite.
vi.mock('./checklist-detail', () => ({
  ChecklistDetailRoute: () => <div>Checklist detail content</div>,
}));
vi.mock('./join', () => ({
  JoinRoute: () => <div>Join content</div>,
}));

// The real route tree behind src/app.tsx — not a rebuilt equivalent. If the
// authenticated shell went back to being wrapped inside each leaf route's
// component, AppLayout would remount on every sibling navigation and these
// tests would fail.
import { createAppRouter } from '@/app-router';

function renderApp(initialPath: string) {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [initialPath] }),
  );
  void router.load();
  return { ...render(<RouterProvider router={router} />), router };
}

describe('app shell instance identity', () => {
  beforeEach(() => {
    mounts.count = 0;
    teamState.activeTeam = null;
    teamState.status = 'ready';
    teamState.teams = [];
    window.localStorage.clear();
  });

  it('mounts AppLayout exactly once across /today -> /checklists -> /today', async () => {
    const { router } = renderApp('/today');

    expect(await screen.findByText('Today content')).toBeInTheDocument();
    expect(mounts.count).toBe(1);

    router.history.push('/checklists');
    expect(await screen.findByText('Checklists content')).toBeInTheDocument();
    expect(mounts.count).toBe(1);

    router.history.push('/today');
    expect(await screen.findByText('Today content')).toBeInTheDocument();
    expect(mounts.count).toBe(1);

    // The dock and header are the same DOM nodes throughout, so the
    // `layoutId` pill can animate rather than being torn down.
    expect(
      screen.getByRole('navigation', { name: 'Розділи' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(mounts.count).toBe(1));
  });

  it('keeps one AppLayout instance when the leaf DOM changes', async () => {
    const { router } = renderApp('/today');

    await screen.findByText('Today content');
    const dockNode = screen.getByRole('navigation', { name: 'Розділи' });

    router.history.push('/history');
    await screen.findByText('History content');

    expect(screen.getByRole('navigation', { name: 'Розділи' })).toBe(dockNode);
    expect(mounts.count).toBe(1);
  });

  it('matches real dynamic route params and preserves join search', async () => {
    const { router } = renderApp('/join/invite-42?returnTo=%2Ftoday');
    expect(await screen.findByText('Join content')).toBeInTheDocument();
    expect(router.state.matches.at(-1)?.routeId).toBe('/join/$token');
    expect(router.state.location.searchStr).toBe('?returnTo=%2Ftoday');

    router.history.push('/checklists/checklist-42');
    expect(
      await screen.findByText('Checklist detail content'),
    ).toBeInTheDocument();
    expect(router.state.matches.at(-1)?.params).toMatchObject({
      checklistId: 'checklist-42',
    });
  });

  it('uses the real onboarding Navigate replace path when no team exists', async () => {
    const { router } = renderApp('/onboarding');
    await waitFor(() => expect(router.state.location.pathname).toBe('/team'));
    router.history.back();
    await waitFor(() => expect(router.state.location.pathname).toBe('/team'));
  });
});
