import { z } from 'zod';

import { parseOrLog } from '@/lib/logger';
import { getSupabase } from '@/lib/supabase';

const completionSchema = z.object({
  id: z.string(),
  completedBy: z.string(),
  completedByName: z.string(),
  completedAt: z.string(),
});
const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  position: z.number(),
  completion: completionSchema.nullable(),
});
const checklistSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  tasks: z.array(taskSchema),
});
export const todaySnapshotSchema = z.object({
  logicalDate: z.string(),
  timezone: z.string(),
  checklists: z.array(checklistSchema),
});
export type TodaySnapshot = z.infer<typeof todaySnapshotSchema>;
export type CompletionMutation =
  | { status: 'created' | 'already_completed' }
  | { status: 'removed' | 'already_uncompleted' };

export function parseCompletionMutation(
  data: unknown,
  statuses: readonly string[],
): CompletionMutation {
  const value = Array.isArray(data) ? data[0] : data;
  const status = z.object({ status: z.string() }).parse(value).status;
  if (!statuses.includes(status))
    throw new Error(`Невідомий статус completion: ${status}`);
  return { status } as CompletionMutation;
}

export async function fetchTodaySnapshot(
  teamId: string,
): Promise<TodaySnapshot> {
  const { data, error } = await getSupabase().rpc('get_today_snapshot', {
    p_team_id: teamId,
  });
  if (error) throw error;
  return parseOrLog(todaySnapshotSchema, data, 'today.snapshot.parse-failed', {
    teamId,
  });
}

export async function completeTask(taskId: string) {
  const { data, error } = await getSupabase().rpc('complete_task', {
    p_task_id: taskId,
  });
  if (error) throw error;
  return parseCompletionMutation(data, ['created', 'already_completed']);
}

export async function uncompleteTask(completionId: string) {
  const { data, error } = await getSupabase().rpc('uncomplete_task', {
    p_completion_id: completionId,
  });
  if (error) throw error;
  return parseCompletionMutation(data, ['removed', 'already_uncompleted']);
}
