import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';

import { Icon, ToastViewport, type IconName } from '@/components/ui';
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
  { icon: 'sun' as const satisfies IconName, label: 'Сьогодні', to: '/today' },
  {
    icon: 'clipboard-list' as const satisfies IconName,
    label: 'Чеклісти',
    to: '/checklists',
  },
  {
    icon: 'clock' as const satisfies IconName,
    label: 'Історія',
    to: '/history',
  },
  { icon: 'users' as const satisfies IconName, label: 'Команда', to: '/team' },
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

  return (
    <div className="flex h-dvh flex-col bg-base-100 pt-[env(safe-area-inset-top)]">
      <div className="relative mx-auto flex min-h-0 w-full flex-1 flex-col sm:max-w-md">
        {activeTeam ? (
          <div className="flex justify-center px-4 pt-2" role="status">
            <span className="badge max-w-full truncate badge-soft badge-primary">
              {activeTeam.name}
            </span>
          </div>
        ) : null}
        <Outlet />
        <nav
          aria-label="Розділи"
          className={cn(
            'dock fixed dock-sm sm:absolute',
            'inset-x-3 z-20 w-auto',
            'bottom-[max(0.75rem,env(safe-area-inset-bottom))]',
            'h-14 rounded-full border-0 bg-base-200 p-1 pb-1 shadow-sm',
            '[&>*]:mb-0 [&>*]:rounded-full [&>*]:after:hidden',
          )}
        >
          {tabs.map((tab) => {
            const isActive = resolveTeamTabRoot(location.pathname) === tab.to;

            return (
              <NavLink
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  isActive && 'dock-active bg-primary text-primary-content',
                )}
                key={tab.to}
                to={tab.to}
              >
                <Icon className="size-6" name={tab.icon} />
                <span className="dock-label">{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <ToastViewport />
      </div>
    </div>
  );
}
