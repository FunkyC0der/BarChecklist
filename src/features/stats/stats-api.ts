import { z } from 'zod';

import { parseOrLog } from '@/lib/logger';
import { getSupabase, unwrapRpcResult } from '@/lib/supabase';

const memberSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  currentMember: z.boolean(),
  completedCount: z.number().int().nonnegative(),
  taskCount: z.number().int().nonnegative(),
  lastCompletionDate: z.string().nullable(),
});
export const memberStatsSchema = z.object({
  logicalToday: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  teamCompletedCount: z.number().int().nonnegative(),
  members: z.array(memberSchema),
});
const memberTaskSchema = z.object({
  taskId: z.string(),
  taskTitle: z.string(),
  checklistId: z.string(),
  checklistName: z.string(),
  checklistArchived: z.boolean(),
  taskArchived: z.boolean(),
  completedCount: z.number().int().nonnegative(),
  lastCompletionDate: z.string().nullable(),
});
export const memberTaskStatsSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  currentMember: z.boolean(),
  fromDate: z.string(),
  toDate: z.string(),
  logicalToday: z.string(),
  completedCount: z.number().int().nonnegative(),
  tasks: z.array(memberTaskSchema),
});

export type MemberStats = z.infer<typeof memberStatsSchema>;
export type MemberTaskStats = z.infer<typeof memberTaskStatsSchema>;
export type StatsFilters = {
  fromDate: string | null;
  toDate: string | null;
  checklistId: string | null;
};

export async function fetchMemberStats(
  teamId: string,
  filters: StatsFilters,
): Promise<MemberStats> {
  const { data, error } = await getSupabase().rpc('get_member_stats', {
    p_team_id: teamId,
    ...(filters.fromDate == null ? {} : { p_from_date: filters.fromDate }),
    ...(filters.toDate == null ? {} : { p_to_date: filters.toDate }),
    ...(filters.checklistId == null
      ? {}
      : { p_checklist_id: filters.checklistId }),
  });
  if (error) throw error;
  return parseOrLog(
    memberStatsSchema,
    unwrapRpcResult(data),
    'stats.members.parse-failed',
    { teamId },
  );
}

export async function fetchMemberTaskStats(
  teamId: string,
  userId: string,
  filters: StatsFilters,
): Promise<MemberTaskStats> {
  const { data, error } = await getSupabase().rpc('get_member_task_stats', {
    p_team_id: teamId,
    p_user_id: userId,
    ...(filters.fromDate == null ? {} : { p_from_date: filters.fromDate }),
    ...(filters.toDate == null ? {} : { p_to_date: filters.toDate }),
    ...(filters.checklistId == null
      ? {}
      : { p_checklist_id: filters.checklistId }),
  });
  if (error) throw error;
  return parseOrLog(
    memberTaskStatsSchema,
    unwrapRpcResult(data),
    'stats.member-tasks.parse-failed',
    { teamId, userId },
  );
}
