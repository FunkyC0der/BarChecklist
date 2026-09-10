import { queryOptions } from '@tanstack/react-query';

import {
  fetchIsSuperAdmin,
  fetchPlatformOverview,
  fetchPlatformTeams,
  type PlatformTeamsParams,
} from '@/features/admin/admin-api';
import { queryKeys } from '@/lib/query-client';

export function superAdminFlagQueryOptions(userId: string) {
  return queryOptions({
    queryFn: fetchIsSuperAdmin,
    queryKey: queryKeys.superAdminFlag(userId),
    staleTime: 5 * 60_000,
  });
}

export function platformOverviewQueryOptions() {
  return queryOptions({
    queryFn: fetchPlatformOverview,
    queryKey: queryKeys.adminOverview(),
  });
}

export function platformTeamsQueryOptions(params: PlatformTeamsParams) {
  return queryOptions({
    queryFn: () => fetchPlatformTeams(params),
    queryKey: queryKeys.adminTeams(params),
  });
}
