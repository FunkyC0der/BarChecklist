import { Navigate } from 'react-router';

import { Loading, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import {
  readStoredActiveTeamTab,
  resolveActiveTeamTab,
} from '@/features/teams/team-tab-storage';
import { useTeams } from '@/features/teams/team-context';

export function IndexRoute() {
  const { session } = useAuth();
  const { activeTeam, status } = useTeams();

  if (!session) return <Navigate replace to="/sign-in" />;
  if (status === 'idle' || status === 'loading') {
    return (
      <Screen scroll={false}>
        <Loading label="Завантажуємо команди…" size="lg" />
      </Screen>
    );
  }

  const target = activeTeam
    ? resolveActiveTeamTab(readStoredActiveTeamTab(session.user.id), '/')
    : '/onboarding';

  return <Navigate replace to={target} />;
}
