import { Redirect, Tabs, type Href, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { theme } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useTeams } from '@/features/teams/team-context';
import {
  isTeamTabPath,
  readStoredActiveTeamTab,
  resolveActiveTeamTab,
  writeStoredActiveTeamTab,
} from '@/features/teams/team-tab-storage';

function rgb(token: keyof typeof theme.colors) {
  return `rgb(${theme.colors[token].rgb})`;
}

export default function AppLayout() {
  const { session } = useAuth();
  const { activeTeam, status } = useTeams();
  const pathname = usePathname();
  const router = useRouter();
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
      resolveActiveTeamTab(readStoredActiveTeamTab(session.user.id), pathname);
    restoreTarget.current = target;

    if (pathname !== target) {
      router.replace(target as Href);
      return;
    }

    restoredTab.current = true;
  }, [activeTeam, pathname, router, session, status]);

  useEffect(() => {
    if (!session || !activeTeam || !restoredTab.current) return;
    if (isTeamTabPath(pathname)) {
      writeStoredActiveTeamTab(session.user.id, pathname);
    }
  }, [activeTeam, pathname, session]);

  // Keep the navigator mounted while the initial team lookup runs. Mounting it
  // only after loading makes Expo Router initialize the first tab (Today) and
  // loses a deep-linked or refreshed tab route such as /team.
  if ((status === 'ready' || status === 'error') && !activeTeam) {
    return <Redirect href={'/onboarding' as Href} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarActiveTintColor: rgb('primary-content'),
        tabBarInactiveTintColor: rgb('base-content'),
        tabBarStyle: {
          backgroundColor: rgb('base-100'),
          borderTopColor: rgb('base-300'),
          borderTopWidth: 2,
        },
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Сьогодні' }} />
      <Tabs.Screen name="checklists" options={{ title: 'Чеклісти' }} />
      <Tabs.Screen name="history" options={{ title: 'Історія' }} />
      <Tabs.Screen name="team" options={{ title: 'Команда' }} />
    </Tabs>
  );
}
