import { Link, useSearchParams } from 'react-router';

import { AuthShell } from '@/components/common/auth-shell';
import { ConfigNotice } from '@/components/common/config-notice';
import { AppText } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { SignUpForm } from '@/features/auth/sign-up-form';
import { safeJoinReturnPath } from '@/features/teams/team-routes';

export function SignUpRoute() {
  const { configIssue } = useAuth();
  const [params] = useSearchParams();
  const safeReturnTo = safeJoinReturnPath(params.get('returnTo'));
  const signInTo = safeReturnTo
    ? `/sign-in?returnTo=${encodeURIComponent(safeReturnTo)}`
    : '/sign-in';

  return (
    <AuthShell
      description="Створіть профіль. Команду можна буде додати на наступному етапі MVP."
      footer={
        <AppText>
          Уже маєте акаунт?{' '}
          <Link className="link" to={signInTo}>
            Увійти
          </Link>
        </AppText>
      }
      title="Реєстрація"
    >
      {configIssue ? (
        <ConfigNotice message={configIssue} />
      ) : (
        <SignUpForm returnTo={safeReturnTo} />
      )}
    </AuthShell>
  );
}
