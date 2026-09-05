import { Navigate } from 'react-router';

import { AuthShell } from '@/components/common/auth-shell';
import { ConfigNotice } from '@/components/common/config-notice';
import { AppText } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { OnboardingForm } from '@/features/teams/onboarding-form';
import { useTeams } from '@/features/teams/team-context';

export function OnboardingRoute() {
  const { configIssue } = useAuth();
  const { activeTeam, status } = useTeams();

  if (status === 'ready' && activeTeam) return <Navigate replace to="/today" />;

  return (
    <AuthShell
      description="Створіть першу команду, щоб почати організовувати зміну."
      footer={
        <AppText tone="muted">Пізніше можна буде додати інші команди.</AppText>
      }
      title="Нова команда"
    >
      {configIssue ? (
        <ConfigNotice message={configIssue} />
      ) : (
        <OnboardingForm />
      )}
    </AuthShell>
  );
}
