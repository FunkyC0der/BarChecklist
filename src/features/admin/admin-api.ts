import { z } from 'zod';

import { parseOrLog } from '@/lib/logger';
import { getSupabase, unwrapRpcResult } from '@/lib/supabase';

export const platformTeamSortOptions = [
  'recent_activity',
  'created',
  'members',
  'completions',
] as const;
export type PlatformTeamSort = (typeof platformTeamSortOptions)[number];

export const platformOverviewSchema = z.object({
  generatedAt: z.string(),
  totals: z.object({
    users: z.number().int().nonnegative(),
    teams: z.number().int().nonnegative(),
    memberships: z.number().int().nonnegative(),
    checklists: z.number().int().nonnegative(),
    checklistsDeleted: z.number().int().nonnegative(),
    tasks: z.number().int().nonnegative(),
    tasksDeleted: z.number().int().nonnegative(),
    completions: z.number().int().nonnegative(),
    openInvites: z.number().int().nonnegative(),
  }),
  growth: z.object({
    usersLast7: z.number().int().nonnegative(),
    usersLast30: z.number().int().nonnegative(),
    teamsLast7: z.number().int().nonnegative(),
    teamsLast30: z.number().int().nonnegative(),
    completionsLast7: z.number().int().nonnegative(),
    completionsLast30: z.number().int().nonnegative(),
  }),
  activity: z.object({
    activeTeamsLast7: z.number().int().nonnegative(),
    activeTeamsLast30: z.number().int().nonnegative(),
    activeUsersLast7: z.number().int().nonnegative(),
    activeUsersLast30: z.number().int().nonnegative(),
  }),
});
export type PlatformOverview = z.infer<typeof platformOverviewSchema>;

const platformTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  timezone: z.string(),
  createdAt: z.string(),
  ownerId: z.string(),
  ownerName: z.string(),
  ownerEmail: z.string(),
  memberCount: z.number().int().nonnegative(),
  checklistCount: z.number().int().nonnegative(),
  taskCount: z.number().int().nonnegative(),
  completionCount: z.number().int().nonnegative(),
  lastCompletionAt: z.string().nullable(),
  hasOpenInvite: z.boolean(),
});
export const platformTeamsSchema = z.object({
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  sort: z.enum(platformTeamSortOptions),
  teams: z.array(platformTeamSchema),
});
export type PlatformTeams = z.infer<typeof platformTeamsSchema>;
export type PlatformTeam = z.infer<typeof platformTeamSchema>;

export type PlatformTeamsParams = {
  limit: number;
  offset: number;
  sort: PlatformTeamSort;
};

export async function fetchIsSuperAdmin(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('is_super_admin');
  if (error) throw error;
  return data;
}

export async function fetchPlatformOverview(): Promise<PlatformOverview> {
  const { data, error } = await getSupabase().rpc('get_platform_overview');
  if (error) throw error;
  return parseOrLog(
    platformOverviewSchema,
    unwrapRpcResult(data),
    'admin.overview.parse-failed',
  );
}

export async function fetchPlatformTeams(
  params: PlatformTeamsParams,
): Promise<PlatformTeams> {
  const { data, error } = await getSupabase().rpc('get_platform_teams', {
    p_limit: params.limit,
    p_offset: params.offset,
    p_sort: params.sort,
  });
  if (error) throw error;
  return parseOrLog(
    platformTeamsSchema,
    unwrapRpcResult(data),
    'admin.teams.parse-failed',
    { params },
  );
}
