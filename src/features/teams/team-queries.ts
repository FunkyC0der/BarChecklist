import { queryOptions } from '@tanstack/react-query';
import { fetchTeamMembers } from '@/features/teams/team-api';
import { queryKeys } from '@/lib/query-client';

export function teamMembersQueryOptions(teamId: string) {
  return queryOptions({
    queryFn: () => fetchTeamMembers(teamId),
    queryKey: queryKeys.teamMembers(teamId),
  });
}
