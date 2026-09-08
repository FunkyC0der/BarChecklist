import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { checklistListQueryOptions } from '@/features/checklists/checklist-queries';
import {
  useTodayRealtime,
  type RealtimeStatus,
} from '@/features/completions/use-today-realtime';
import { useTeams } from '@/features/teams/team-context';
import { queryKeys } from '@/lib/query-client';

type TodayRealtimeContextValue = {
  retry: () => void;
  status: RealtimeStatus;
};

const TodayRealtimeContext = createContext<TodayRealtimeContextValue | null>(
  null,
);

/**
 * Owns the today realtime channel at the app-shell level (a parent of the
 * per-tab Outlet) so it survives tab navigation instead of reconnecting —
 * and flashing the connection banner — every time the Today tab remounts.
 */
export function TodayRealtimeProvider({ children }: { children: ReactNode }) {
  const { activeTeam } = useTeams();
  const teamId = activeTeam?.id ?? null;
  const queryClient = useQueryClient();
  const checklistsQuery = useQuery({
    ...checklistListQueryOptions(teamId ?? 'none'),
    enabled: Boolean(teamId),
  });
  const checklistIds = useMemo(
    () =>
      checklistsQuery.data?.checklists.map((checklist) => checklist.id) ?? [],
    [checklistsQuery.data],
  );

  const { realtimeStatus, retryRealtime } = useTodayRealtime({
    checklistIds,
    onRefresh: () =>
      void queryClient.invalidateQueries({
        queryKey: queryKeys.todayForTeam(teamId ?? 'none'),
      }),
    teamId,
  });

  const value = useMemo(
    () => ({ retry: retryRealtime, status: realtimeStatus }),
    [realtimeStatus, retryRealtime],
  );

  return (
    <TodayRealtimeContext.Provider value={value}>
      {children}
    </TodayRealtimeContext.Provider>
  );
}

export function useTodayRealtimeStatus() {
  const value = useContext(TodayRealtimeContext);
  if (!value) {
    throw new Error(
      'useTodayRealtimeStatus must be used within TodayRealtimeProvider.',
    );
  }
  return value;
}
