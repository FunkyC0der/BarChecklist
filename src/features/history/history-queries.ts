import {
  infiniteQueryOptions,
  queryOptions,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  fetchHistory,
  fetchHistoryFilterOptions,
  type HistoryFilters,
  type HistoryResponse,
} from '@/features/history/history-api';
import { queryKeys } from '@/lib/query-client';

export const emptyFilters: HistoryFilters = {
  beforeDate: null,
  checklistId: null,
  fromDate: null,
  toDate: null,
  userId: null,
};

export function historyQueryOptions(teamId: string, filters: HistoryFilters) {
  return infiniteQueryOptions<
    HistoryResponse,
    Error,
    InfiniteData<HistoryResponse>,
    readonly unknown[],
    string | null
  >({
    getNextPageParam: (page) => page?.nextBeforeDate ?? undefined,
    initialPageParam: null as string | null,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === teamId ? previousData : undefined,
    queryFn: ({ pageParam }) =>
      fetchHistory(teamId, { ...filters, beforeDate: pageParam }),
    queryKey: queryKeys.history(teamId, filters),
  });
}

export function historyOptionsQueryOptions(teamId: string) {
  return queryOptions({
    queryFn: () => fetchHistoryFilterOptions(teamId),
    queryKey: queryKeys.historyOptions(teamId),
  });
}
