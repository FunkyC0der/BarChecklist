import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet } from '@/lib/router';
import { useSearchParams } from '@/lib/router-hooks';

import { Alert, Button, Loading, Screen } from '@/components/ui';
import { useSuperAdmin } from '@/features/admin/use-super-admin';
import { useAuth } from '@/features/auth/auth-context';
import { safeJoinReturnPath } from '@/features/teams/team-routes';
import { logger } from '@/lib/logger';

export function RequireAuth({ children }: { children?: ReactNode }) {
  const { session } = useAuth();

  // Derive the redirect target once per sign-out — on mount if the user is
  // already signed out, and again if `session` later flips from truthy to
  // falsy — with the same "adjusting state during render" pattern as
  // RequireGuest below. This guard lives in the persistent pathless shell
  // route (see src/app.tsx), so it stays mounted while the redirect is in
  // flight: TanStack commits the destination URL before the shell match
  // unmounts, and recomputing from `window.location.pathname` on every
  // render would then flip `to` to a bare '/sign-in' and stomp the
  // returnTo with a second navigation.
  const computeTarget = () => {
    const returnTo =
      typeof window === 'undefined'
        ? null
        : safeJoinReturnPath(window.location.pathname);
    return returnTo
      ? `/sign-in?returnTo=${encodeURIComponent(returnTo)}`
      : '/sign-in';
  };
  const [state, setState] = useState(() => ({
    session,
    target: session ? null : computeTarget(),
  }));
  let target = state.target;
  if (session !== state.session) {
    target = session ? null : computeTarget();
    setState({ session, target });
  }

  if (!session) {
    return <Navigate replace to={target ?? '/sign-in'} />;
  }

  return children ?? <Outlet />;
}

export function RequireGuest({ children }: { children?: ReactNode }) {
  const { session } = useAuth();
  const [params] = useSearchParams();

  // Derive the redirect target once per sign-in — on mount if the user is
  // already signed in, and again if `session` later flips from falsy to
  // truthy — per React's "adjusting state during render" pattern (see
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders).
  // Once Navigate below kicks off the redirect, the router updates its
  // location before this component unmounts, which would otherwise
  // re-render here with the *destination's* (query-less) search and stomp
  // the target with the '/today' fallback mid-navigation. Deriving only on
  // a `session` transition (rather than recomputing on every render) avoids
  // that race.
  const computeTarget = () =>
    safeJoinReturnPath(params.get('returnTo')) ?? '/today';
  const [state, setState] = useState(() => ({
    session,
    target: session ? computeTarget() : null,
  }));
  let target = state.target;
  if (session !== state.session) {
    target = session ? computeTarget() : null;
    setState({ session, target });
  }

  if (session) {
    return <Navigate replace to={target ?? '/today'} />;
  }

  return children ?? <Outlet />;
}

export function RequireSuperAdmin({ children }: { children?: ReactNode }) {
  const { isAdmin, isResolved } = useSuperAdmin();

  if (!isResolved) {
    return (
      <Screen scroll={false}>
        <Loading label="Перевіряємо доступ…" size="lg" />
      </Screen>
    );
  }

  if (!isAdmin) {
    return <Navigate replace to="/today" />;
  }

  return children ?? <Outlet />;
}

export function SessionGate({ children }: { children: ReactNode }) {
  const { initializationError, initialized, retrySessionInitialization } =
    useAuth();

  useEffect(() => {
    if (initializationError) {
      logger.error('auth.session-gate.blocked', initializationError);
    }
  }, [initializationError]);

  if (!initialized) {
    return (
      <Screen scroll={false}>
        <Loading label="Відновлюємо сесію…" size="lg" />
      </Screen>
    );
  }

  if (initializationError) {
    return (
      <Screen scroll={false}>
        <div className="flex w-full max-w-md flex-col gap-4">
          <Alert color="warning">
            Не вдалося відновити сесію. Перевірте з’єднання та повторіть.
          </Alert>
          <Button
            className="btn-block"
            color="primary"
            onClick={() => void retrySessionInitialization()}
          >
            Спробувати ще раз
          </Button>
        </div>
      </Screen>
    );
  }

  return children;
}
