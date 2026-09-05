import { Link, useLocalSearchParams } from 'expo-router';

import { AuthShell } from '@/components/common/auth-shell';
import { ConfigNotice } from '@/components/common/config-notice';
import { AppText } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { SignUpForm } from '@/features/auth/sign-up-form';
import { safeJoinReturnPath } from '@/features/teams/team-routes';

export default function SignUpScreen() {
  const { configIssue } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const safeReturnTo = safeJoinReturnPath(returnTo);

  return (
    <AuthShell
      description="Створіть профіль. Команду можна буде додати на наступному етапі MVP."
      footer={
        <AppText>
          Уже маєте акаунт?{' '}
          <Link
            className="font-bold text-primary-content"
            href={{
              pathname: '/sign-in',
              params: safeReturnTo ? { returnTo: safeReturnTo } : {},
            }}
          >
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
