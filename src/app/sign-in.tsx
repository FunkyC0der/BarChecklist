import { Link, useLocalSearchParams } from 'expo-router';

import { AuthShell } from '@/components/common/auth-shell';
import { ConfigNotice } from '@/components/common/config-notice';
import { AppText } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { SignInForm } from '@/features/auth/sign-in-form';
import { safeJoinReturnPath } from '@/features/teams/team-routes';

export default function SignInScreen() {
  const { configIssue } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const safeReturnTo = safeJoinReturnPath(returnTo);

  return (
    <AuthShell
      description="Введіть дані, щоб продовжити роботу з командою."
      footer={
        <AppText>
          Ще немає акаунта?{' '}
          <Link
            className="font-bold text-primary-content"
            href={{
              pathname: '/sign-up',
              params: safeReturnTo ? { returnTo: safeReturnTo } : {},
            }}
          >
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
