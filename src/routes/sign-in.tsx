import { Link } from '@/lib/router';
import { useSearchParams } from '@/lib/router-hooks';

import { AuthShell } from '@/components/common/auth-shell';
import { ConfigNotice } from '@/components/common/config-notice';
import { AppText } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { SignInForm } from '@/features/auth/sign-in-form';
import { safeJoinReturnPath } from '@/features/teams/team-routes';

export function SignInRoute() {
  const { configIssue } = useAuth();
  const [params] = useSearchParams();
  const safeReturnTo = safeJoinReturnPath(params.get('returnTo'));
  const signUpTo = safeReturnTo
    ? `/sign-up?returnTo=${encodeURIComponent(safeReturnTo)}`
    : '/sign-up';

  return (
    <AuthShell
      description="Введіть дані, щоб продовжити роботу з командою."
      footer={
        <AppText>
          Ще немає акаунта?{' '}
          <Link className="link" to={signUpTo}>
            Зареєструватися
          </Link>
        </AppText>
      }
      title="Вхід"
    >
      {configIssue ? (
        <ConfigNotice message={configIssue} />
      ) : (
        <SignInForm returnTo={safeReturnTo} />
      )}
    </AuthShell>
  );
}
