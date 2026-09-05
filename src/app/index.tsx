import { Redirect, type Href } from 'expo-router';

import { useAuth } from '@/features/auth/auth-context';
import { useTeams } from '@/features/teams/team-context';
import { Loading, Screen } from '@/components/ui';

export default function IndexScreen() {
  const { session } = useAuth();
  const { activeTeam, status } = useTeams();

  if (!session) return <Redirect href="/sign-in" />;
  if (status === 'idle' || status === 'loading') {
    return (
      <Screen scroll={false}>
        <Loading label="Завантажуємо команди…" size="large" />
      </Screen>
    );
  }

  return <Redirect href={(activeTeam ? '/today' : '/onboarding') as Href} />;
}
