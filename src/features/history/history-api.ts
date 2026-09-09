import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

const completionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  taskTitle: z.string(),
  checklistId: z.string(),
  checklistName: z.string(),
  completedBy: z.string(),
  completedByName: z.string(),
  completedAt: z.string(),
});
const missedTaskSchema = z.object({
  taskId: z.string(),
  taskTitle: z.string(),
  checklistId: z.string(),
  checklistName: z.string(),
});
const historyDaySchema = z.object({
  date: z.string(),
  completedCount: z.number().int().nonnegative(),
  completions: z.array(completionSchema),
  missedCount: z.number().int().nonnegative().default(0),
  missed: z.array(missedTaskSchema).default([]),
});
export const historySnapshotSchema = z.object({
  logicalToday: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  days: z.array(historyDaySchema),
  hasMore: z.boolean(),
  nextBeforeDate: z.string().nullable(),
});
export const historyFilterOptionsSchema = z.object({
  checklists: z.array(
    z.object({ id: z.string(), name: z.string(), archived: z.boolean() }),
  ),
  users: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      currentMember: z.boolean(),
    }),
  ),
});

export type HistoryResponse = z.infer<typeof historySnapshotSchema>;
/** @deprecated Use HistoryResponse. */
export type HistorySnapshot = HistoryResponse;
export type HistoryFilterOptions = z.infer<typeof historyFilterOptionsSchema>;
export type HistoryFilters = {
  fromDate: string | null;
  toDate: string | null;
  checklistId: string | null;
  userId: string | null;
  beforeDate: string | null;
};
export type HistoryQuery = {
  teamId: string;
  fromDate?: string | null;
  toDate?: string | null;
  checklistId?: string | null;
  userId?: string | null;
  limit?: number;
  beforeDate?: string | null;
};

function unwrapRpcResult(data: unknown): unknown {
  return Array.isArray(data) ? data[0] : data;
}

export async function fetchHistory(
  teamId: string,
  filters?: Partial<HistoryFilters> & { limit?: number },
): Promise<HistoryResponse>;
export async function fetchHistory(
  query: HistoryQuery,
): Promise<HistoryResponse>;
export async function fetchHistory(
  teamOrQuery: string | HistoryQuery,
  filters: Partial<HistoryFilters> & { limit?: number } = {},
): Promise<HistoryResponse> {
  const query: HistoryQuery =
    typeof teamOrQuery === 'string'
      ? { teamId: teamOrQuery, ...filters }
      : teamOrQuery;
  const { data, error } = await getSupabase().rpc('get_history', {
    p_team_id: query.teamId,
    ...(query.fromDate == null ? {} : { p_from_date: query.fromDate }),
    ...(query.toDate == null ? {} : { p_to_date: query.toDate }),
    ...(query.checklistId == null ? {} : { p_checklist_id: query.checklistId }),
    ...(query.userId == null ? {} : { p_user_id: query.userId }),
    ...(query.limit === undefined ? {} : { p_limit: query.limit }),
    ...(query.beforeDate == null ? {} : { p_before_date: query.beforeDate }),
  });
  if (error) throw error;
  return historySnapshotSchema.parse(unwrapRpcResult(data));
}

export async function fetchHistoryFilterOptions(
  teamId: string,
): Promise<HistoryFilterOptions> {
  const { data, error } = await getSupabase().rpc(
    'get_history_filter_options',
    {
      p_team_id: teamId,
    },
  );
  if (error) throw error;
  return historyFilterOptionsSchema.parse(unwrapRpcResult(data));
}
