import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { checklistListQueryOptions } from '@/features/checklists/checklist-queries';
import { todaySnapshotQueryOptions } from '@/features/completions/today-queries';
import {
  emptyFilters,
  historyOptionsQueryOptions,
  historyQueryOptions,
} from '@/features/history/history-queries';
import { useTeams } from '@/features/teams/team-context';
import { teamMembersQueryOptions } from '@/features/teams/team-queries';
import { logicalDate } from '@/lib/dates';

/**
 * Prefetches the queries backing the Today / Checklists / History / Team
 * tabs as soon as the active team is known, so switching tabs doesn't show
 * a skeleton just because that tab's query has never been mounted yet.
 *
 * Does NOT prefetch queryKeys.teamInvite — it's owner-only and holds a
 * sensitive token, so it stays lazily fetched from team.tsx.
 */
export function useTabPrefetch() {
  const queryClient = useQueryClient();
  const { activeTeam, status } = useTeams();

  useEffect(() => {
    if (status !== 'ready' || !activeTeam) return;

    const teamId = activeTeam.id;
    const todayDate = logicalDate(new Date(), activeTeam.timezone);

    void queryClient.prefetchQuery(
      todaySnapshotQueryOptions(teamId, todayDate),
    );
    void queryClient.prefetchQuery(checklistListQueryOptions(teamId));
    void queryClient.prefetchQuery(teamMembersQueryOptions(teamId));
    void queryClient.prefetchInfiniteQuery(
      historyQueryOptions(teamId, emptyFilters),
    );
    void queryClient.prefetchQuery(historyOptionsQueryOptions(teamId));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the active team or its readiness changes
  }, [activeTeam?.id, status, queryClient]);
}
