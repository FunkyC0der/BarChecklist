import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';

import { Icon, Sheet, ToastViewport, type IconName } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { OnboardingForm } from '@/features/teams/onboarding-form';
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
  const { session, signOut } = useAuth();
  const { activeTeam, selectTeam, status, teams = [] } = useTeams();
  const location = useLocation();
  const navigate = useNavigate();
  const restoredTab = useRef(false);
  const restoreTarget = useRef<string | null>(null);
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const isChecklistDetail = /^\/checklists\/[^/]+$/.test(location.pathname);
  const isOwner = Boolean(
    activeTeam && session?.user.id === activeTeam.owner_id,
  );

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

  useEffect(() => {
    const dismissAccountMenu = (event: PointerEvent) => {
      const menu = accountMenuRef.current;
      if (
        menu?.open &&
        event.target instanceof Node &&
        !menu.contains(event.target)
      ) {
        menu.removeAttribute('open');
      }
    };

    document.addEventListener('pointerdown', dismissAccountMenu);
    return () =>
      document.removeEventListener('pointerdown', dismissAccountMenu);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-x-clip bg-base-100 pt-[env(safe-area-inset-top)]">
      <div className="relative mx-auto flex min-h-0 w-full flex-1 flex-col sm:max-w-md">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-base-300/60 bg-base-100 px-4">
          <button
            className="min-h-11 max-w-[calc(100%-3.5rem)] truncate text-left text-base font-semibold"
            onClick={() => setTeamsOpen(true)}
            type="button"
          >
            {activeTeam?.name ?? 'Checklister'}
          </button>
          <details
            className="dropdown dropdown-end dropdown-bottom"
            ref={accountMenuRef}
          >
            <summary
              aria-label="Меню акаунта"
              className="btn btn-circle list-none btn-ghost [&::-webkit-details-marker]:hidden"
            >
              <Icon name="more-horizontal" />
            </summary>
            <ul className="menu dropdown-content z-40 mt-1 w-56 rounded-box bg-base-100 p-2 shadow-sm">
              {session?.user.email ? (
                <li className="max-w-full truncate menu-title px-3 py-2 text-xs font-normal normal-case">
                  {session.user.email}
                </li>
              ) : null}
              <li>
                <button
                  onClick={(event) => {
                    event.currentTarget
                      .closest('details')
                      ?.removeAttribute('open');
                    setTeamsOpen(true);
                  }}
                  type="button"
                >
                  <Icon name="users" />
                  Команди
                </button>
              </li>
              <li>
                {isChecklistDetail && isOwner ? (
                  <button
                    className="text-error"
                    onClick={(event) => {
                      event.currentTarget
                        .closest('details')
                        ?.removeAttribute('open');
                      window.dispatchEvent(
                        new Event('checklister:delete-checklist'),
                      );
                    }}
                    type="button"
                  >
                    <Icon name="trash" />
                    Видалити чекліст
                  </button>
                ) : null}
              </li>
              <li>
                <button onClick={() => void signOut()} type="button">
                  <Icon name="log-out" />
                  Вийти з акаунта
                </button>
              </li>
            </ul>
          </details>
        </header>
        <Outlet />
        <nav
          aria-label="Розділи"
          className={cn(
            'dock fixed dock-sm sm:absolute',
            'inset-x-3 z-20 w-auto',
            'bottom-[max(0.75rem,env(safe-area-inset-bottom))]',
            'h-14 rounded-full border border-base-300/60 bg-base-200 p-1 pb-1 shadow-sm',
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
        <Sheet
          onClose={() => {
            setTeamsOpen(false);
            setCreateTeamOpen(false);
          }}
          open={teamsOpen}
          title="Команди"
        >
          {createTeamOpen ? (
            <div className="flex flex-col gap-3">
              <button
                className="btn self-start btn-ghost"
                onClick={() => setCreateTeamOpen(false)}
                type="button"
              >
                <Icon name="chevron-left" /> Назад до команд
              </button>
              <OnboardingForm
                compact
                onCreated={() => setCreateTeamOpen(false)}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <ul className="menu w-full p-0">
                {teams.map((team) => (
                  <li key={team.id}>
                    <button
                      className="min-h-11 justify-between"
                      onClick={() => {
                        selectTeam(team.id);
                        setTeamsOpen(false);
                      }}
                      type="button"
                    >
                      <span className="truncate">{team.name}</span>
                      {team.id === activeTeam?.id ? (
                        <Icon name="check" />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                className="btn btn-block btn-outline"
                onClick={() => setCreateTeamOpen(true)}
                type="button"
              >
                <Icon name="plus" />
                Створити нову команду
              </button>
            </div>
          )}
        </Sheet>
      </div>
    </div>
  );
}
