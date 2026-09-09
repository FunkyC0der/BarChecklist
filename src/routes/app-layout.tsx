import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Menu } from '@base-ui/react/menu';
import { NavLink, Outlet } from '@/lib/router';
import { useLocation, useNavigate } from '@/lib/router-hooks';

import { Icon, Sheet, ToastViewport, type IconName } from '@/components/ui';
import {
  bottomDockHeightClass,
  bottomDockInsetClass,
  bottomSurfaceTokensClass,
} from '@/components/ui/bottom-surface';
import { useAuth } from '@/features/auth/auth-context';
import { TodayRealtimeProvider } from '@/features/completions/today-realtime-context';
import { OnboardingForm } from '@/features/teams/onboarding-form';
import { useTeams } from '@/features/teams/team-context';
import { TeamRealtimeProvider } from '@/features/teams/team-realtime-context';
import {
  readStoredActiveTeamTab,
  resolveActiveTeamTab,
  resolveTeamTabRoot,
  writeStoredActiveTeamTab,
} from '@/features/teams/team-tab-storage';
import { useTabPrefetch } from '@/features/teams/use-tab-prefetch';
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

export function AppLayout({ children }: { children?: React.ReactNode }) {
  return (
    <TeamRealtimeProvider>
      <TodayRealtimeProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </TodayRealtimeProvider>
    </TeamRealtimeProvider>
  );
}

function AppLayoutContent({ children }: { children?: React.ReactNode }) {
  const { session, signOut } = useAuth();
  const queryClient = useQueryClient();
  const signOutMutation = useMutation({
    mutationFn: () => signOut(),
    // Defense-in-depth: drop every cached query (including any invite
    // token held in teamInvite(teamId)) so it can't leak to whoever signs
    // in next on this device.
    onSuccess: () => queryClient.clear(),
  });
  const { activeTeam, selectTeam, status, teams = [] } = useTeams();
  useTabPrefetch();
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const restoredTab = useRef(false);
  const restoreTarget = useRef<string | null>(null);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const teamsTriggerRef = useRef<HTMLElement | null>(null);
  const accountMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
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

  return (
    <div className="flex h-dvh flex-col overflow-x-clip bg-base-200 pt-[env(safe-area-inset-top)]">
      <div className="relative mx-auto flex min-h-0 w-full flex-1 flex-col bg-base-100 sm:max-w-md">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-base-300/60 bg-base-100 px-4">
          <button
            aria-label={
              activeTeam
                ? `Обрати команду, зараз ${activeTeam.name}`
                : 'Обрати команду'
            }
            className="flex min-h-11 max-w-[calc(100%-3.5rem)] items-center gap-1 text-left text-base font-semibold"
            onClick={(event) => {
              teamsTriggerRef.current = event.currentTarget;
              setTeamsOpen(true);
            }}
            type="button"
          >
            <span className="truncate">
              {activeTeam?.name ?? 'Checklister'}
            </span>
            <Icon
              className="size-4 shrink-0 text-base-content/50"
              name="chevron-down"
            />
          </button>
          <Menu.Root
            modal={false}
            onOpenChange={setAccountMenuOpen}
            open={accountMenuOpen}
          >
            <Menu.Trigger
              aria-label="Меню акаунта"
              className="btn btn-circle btn-ghost"
              onPointerDown={(event) => {
                // Mobile Safari can omit the compatibility mouse event that
                // Base UI's menu trigger normally uses. Toggle directly for
                // touch input so the account menu remains reachable.
                if (event.pointerType !== 'touch') return;
                event.preventDefault();
                setAccountMenuOpen((open) => !open);
              }}
              ref={accountMenuTriggerRef}
            >
              <Icon name="more-horizontal" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner
                align="end"
                className="dropdown dropdown-end dropdown-bottom z-40"
                side="bottom"
              >
                <Menu.Popup
                  render={
                    <ul className="app-menu-popup menu dropdown-content mt-1 w-56 rounded-box bg-base-100 p-2 shadow-sm" />
                  }
                >
                  {session?.user.email ? (
                    <li className="max-w-full truncate menu-title px-3 py-2 text-xs font-normal normal-case">
                      {session.user.email}
                    </li>
                  ) : null}
                  <li>
                    <Menu.Item
                      nativeButton
                      render={<button type="button" />}
                      onClick={() => {
                        teamsTriggerRef.current = accountMenuTriggerRef.current;
                        setTeamsOpen(true);
                      }}
                    >
                      <Icon name="users" />
                      Команди
                    </Menu.Item>
                  </li>
                  {isChecklistDetail && isOwner ? (
                    <li>
                      <Menu.Item
                        className="text-error"
                        nativeButton
                        onClick={() => {
                          queueMicrotask(() =>
                            window.dispatchEvent(
                              new CustomEvent('checklister:delete-checklist', {
                                detail: {
                                  trigger: accountMenuTriggerRef.current,
                                },
                              }),
                            ),
                          );
                        }}
                        render={<button type="button" />}
                      >
                        <Icon name="trash" />
                        Видалити чекліст
                      </Menu.Item>
                    </li>
                  ) : null}
                  <li>
                    <Menu.Item
                      disabled={signOutMutation.isPending}
                      nativeButton
                      onClick={() => void signOutMutation.mutateAsync()}
                      render={<button type="button" />}
                    >
                      <Icon name="log-out" />
                      Вийти з акаунта
                    </Menu.Item>
                  </li>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </header>
        <motion.main
          animate={{ opacity: 1, transform: 'translateY(0)' }}
          className="flex min-h-0 flex-1 flex-col"
          initial={
            reducedMotion ? false : { opacity: 0, transform: 'translateY(8px)' }
          }
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children ?? <Outlet />}
        </motion.main>
        <nav
          aria-label="Розділи"
          className={cn(
            'dock fixed dock-sm sm:absolute',
            'inset-x-3 z-20 w-auto',
            bottomDockInsetClass,
            bottomSurfaceTokensClass,
            `${bottomDockHeightClass} rounded-full border border-base-300/60 bg-base-200 p-1 pb-1 shadow-sm`,
            '[&>*]:mb-0 [&>*]:rounded-full [&>*]:after:hidden',
          )}
        >
          {tabs.map((tab) => {
            const isActive = resolveTeamTabRoot(location.pathname) === tab.to;

            return (
              <NavLink
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative isolate transition-colors duration-150',
                  isActive && 'dock-active text-primary-content',
                )}
                key={tab.to}
                to={tab.to}
              >
                {isActive ? (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-full bg-primary"
                    layoutId="active-dock-pill"
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  />
                ) : null}
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
          triggerRef={teamsTriggerRef}
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
