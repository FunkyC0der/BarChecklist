import { useCallback, useEffect, useRef, useState } from 'react';
import { getPublicEnvIssue } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';
export { useLogicalDateRefresh } from './use-logical-date-refresh';

export type RealtimeStatus = 'connecting' | 'connected' | 'degraded';
type Args = {
  teamId: string | null;
  checklistIds: readonly string[];
  onRefresh: () => void;
};

export function useTodayRealtime({ teamId, checklistIds, onRefresh }: Args) {
  const [connection, setConnection] = useState<{
    retryKey: number;
    status: RealtimeStatus;
    teamId: string;
  } | null>(null);
  const refreshRef = useRef(onRefresh);
  const idsRef = useRef(checklistIds);
  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);
  useEffect(() => {
    idsRef.current = checklistIds;
  }, [checklistIds]);
  const [retryToken, setRetryToken] = useState(0);
  const checklistKey = checklistIds.join(',');
  const retryRealtime = useCallback(
    () => setRetryToken((value) => value + 1),
    [],
  );

  useEffect(() => {
    if (!teamId || getPublicEnvIssue()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => refreshRef.current(), 150);
    };
    const supabase = getSupabase();
    const channel = supabase
      .channel(`today:${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_completions',
          filter: `team_id=eq.${teamId}`,
        },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklists',
          filter: `team_id=eq.${teamId}`,
        },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `id=eq.${teamId}`,
        },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: idsRef.current.length
            ? `checklist_id=in.(${idsRef.current.join(',')})`
            : 'checklist_id=eq.00000000-0000-0000-0000-000000000000',
        },
        refresh,
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnection({ retryKey: retryToken, status: 'connected', teamId });
          refresh();
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          setConnection({ retryKey: retryToken, status: 'degraded', teamId });
        }
      });
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [teamId, retryToken, checklistKey]);

  return {
    realtimeStatus: getPublicEnvIssue()
      ? 'degraded'
      : connection?.teamId === teamId && connection.retryKey === retryToken
        ? connection.status
        : 'connecting',
    retryRealtime,
  };
}
