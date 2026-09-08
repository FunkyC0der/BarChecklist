import {
  useNavigate as useTanStackNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { useCallback } from 'react';

/** Shared non-component helpers for `@/lib/router` (kept in a separate
 * module so that file only exports components, per react-refresh). */

export function useLocation() {
  return useRouterState({ select: (state) => state.location });
}

export function useNavigate() {
  const navigate = useTanStackNavigate();

  return useCallback(
    (to: string, options?: { replace?: boolean }) =>
      navigate({
        to: to as never,
        ...(options?.replace ? { replace: true } : {}),
      }),
    [navigate],
  );
}

export function useParams<
  T extends Record<string, string | undefined> = Record<
    string,
    string | undefined
  >,
>() {
  const params = useRouterState({
    select: (state) => state.matches.at(-1)?.params,
  });
  return (params ?? {}) as T;
}

export function useSearchParams() {
  const search = useRouterState({
    select: (state) => state.location.searchStr,
  });
  const navigate = useTanStackNavigate();

  return [
    new URLSearchParams(search),
    (next: URLSearchParams) =>
      navigate({ search: Object.fromEntries(next) } as never),
  ] as const;
}
