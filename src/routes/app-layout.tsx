import { useEffect, useRef } from 'react';
import {
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router';

import { useAuth } from '@/features/auth/auth-context';
import { useTeams } from '@/features/teams/team-context';
import {
  readStoredActiveTeamTab,
  resolveActiveTeamTab,
  resolveTeamTabRoot,
  writeStoredActiveTeamTab,
} from '@/features/teams/team-tab-storage';
import { cn } from '@/lib/cn';

const tabs = [
  { to: '/today', label: 'Сьогодні' },
  { to: '/checklists', label: 'Чеклісти' },
  { to: '/history', label: 'Історія' },
  { to: '/team', label: 'Команда' },
] as const;

export function AppLayout() {
  const { session } = useAuth();
  const { activeTeam, status } = useTeams();
  const location = useLocation();
  const navigate = useNavigate();
  const restoredTab = useRef(false);
  const restoreTarget = useRef<string | null>(null);

  useEffect(() => {
    restoredTab.current = false;
    restoreTarget.current = null;
  }, [session?.user.id]);

  useEffect(() => {
    if (!session || !activeTeam || status !== 'ready' || restoredTab.current) {
      return;
    }

    const target =
      restoreTarget.current ??
      resolveActiveTeamTab(
        readStoredActiveTeamTab(session.user.id),
        location.pathname,
      );
    restoreTarget.current = target;

    if (location.pathname !== target) {
      navigate(target, { replace: true });
      return;
    }

    restoredTab.current = true;
  }, [activeTeam, location.pathname, navigate, session, status]);

  useEffect(() => {
    if (!session || !activeTeam || !restoredTab.current) return;
    const tabRoot = resolveTeamTabRoot(location.pathname);
    if (tabRoot) {
      writeStoredActiveTeamTab(session.user.id, tabRoot);
    }
  }, [activeTeam, location.pathname, session]);

  if ((status === 'ready' || status === 'error') && !activeTeam) {
    return <Navigate replace to="/onboarding" />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-base-200 pt-[env(safe-area-inset-top)]">
      <main className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-hidden px-3 pt-3">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-t-box border border-b-0 border-base-300 bg-base-100 p-4">
          <Outlet />
        </div>
        <nav
          aria-label="Розділи"
          className="relative z-20 shrink-0 pb-[env(safe-area-inset-bottom)]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-full h-5 bg-linear-to-t from-base-100 to-transparent"
          />
          <div className="tabs tabs-lift w-full tabs-bottom" role="tablist">
            {tabs.map((tab) => {
              const isActive = resolveTeamTabRoot(location.pathname) === tab.to;

              return (
                <NavLink
                  aria-selected={isActive}
                  className={cn(
                    'tab h-12 min-h-12 flex-1 touch-manipulation px-1 text-xs leading-tight sm:text-sm',
                    isActive && 'tab-active',
                  )}
                  key={tab.to}
                  role="tab"
                  to={tab.to}
                >
                  {tab.label}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
