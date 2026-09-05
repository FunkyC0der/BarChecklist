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
  isTeamTabPath,
  readStoredActiveTeamTab,
  resolveActiveTeamTab,
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
    if (isTeamTabPath(location.pathname)) {
      writeStoredActiveTeamTab(session.user.id, location.pathname);
    }
  }, [activeTeam, location.pathname, session]);

  if ((status === 'ready' || status === 'error') && !activeTeam) {
    return <Navigate replace to="/onboarding" />;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex-1 pb-24">
        <Outlet />
      </div>
      <nav className="dock">
        {tabs.map((tab) => (
          <NavLink
            className={({ isActive }) => cn(isActive && 'dock-active')}
            key={tab.to}
            to={tab.to}
          >
            <span className="dock-label">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
