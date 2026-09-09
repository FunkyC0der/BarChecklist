import { queryOptions } from '@tanstack/react-query';

import {
  fetchMemberStats,
  fetchMemberTaskStats,
  type StatsFilters,
} from '@/features/stats/stats-api';
import { queryKeys } from '@/lib/query-client';

export const emptyStatsFilters: StatsFilters = {
  fromDate: null,
  toDate: null,
  checklistId: null,
};

export function defaultStatsRange(logicalToday: string): StatsFilters {
  const date = new Date(`${logicalToday}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 29);
  return {
    ...emptyStatsFilters,
    fromDate: date.toISOString().slice(0, 10),
    toDate: logicalToday,
  };
}

export function memberStatsQueryOptions(teamId: string, filters: StatsFilters) {
  return queryOptions({
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === teamId ? previousData : undefined,
    queryFn: () => fetchMemberStats(teamId, filters),
    queryKey: queryKeys.memberStats(teamId, filters),
  });
}

export function memberTaskStatsQueryOptions(
  teamId: string,
  userId: string,
  filters: StatsFilters,
) {
  return queryOptions({
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === teamId ? previousData : undefined,
    queryFn: () => fetchMemberTaskStats(teamId, userId, filters),
    queryKey: queryKeys.memberTaskStats(teamId, userId, filters),
  });
}
