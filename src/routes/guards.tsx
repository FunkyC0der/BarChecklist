import type { ReactNode } from 'react';
import { Navigate, Outlet, useSearchParams } from 'react-router';

import { Loading, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { safeJoinReturnPath } from '@/features/teams/team-routes';

export function RequireAuth() {
  const { session } = useAuth();

  if (!session) {
    const returnTo =
      typeof window === 'undefined'
        ? null
        : safeJoinReturnPath(window.location.pathname);
    const to = returnTo
      ? `/sign-in?returnTo=${encodeURIComponent(returnTo)}`
      : '/sign-in';
    return <Navigate replace to={to} />;
  }

  return <Outlet />;
}

export function RequireGuest() {
  const { session } = useAuth();
  const [params] = useSearchParams();

  if (session) {
    const returnTo = safeJoinReturnPath(params.get('returnTo'));
    return <Navigate replace to={returnTo ?? '/'} />;
  }

  return <Outlet />;
}

export function SessionGate({ children }: { children: ReactNode }) {
  const { initialized } = useAuth();

  if (!initialized) {
    return (
      <Screen scroll={false}>
        <Loading label="Відновлюємо сесію…" size="lg" />
      </Screen>
    );
  }

  return children;
}
