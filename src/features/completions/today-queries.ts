import { queryOptions } from '@tanstack/react-query';
import { fetchTodaySnapshot } from '@/features/completions/today-api';
import { queryKeys } from '@/lib/query-client';

export function todaySnapshotQueryOptions(teamId: string, logicalDate: string) {
  return queryOptions({
    queryFn: () => fetchTodaySnapshot(teamId),
    queryKey: queryKeys.today(teamId, logicalDate),
  });
}
