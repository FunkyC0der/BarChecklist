import { useCallback, useEffect, useRef, useState } from 'react';
import { getPublicEnvIssue } from '@/lib/env';
import { logger } from '@/lib/logger';
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
    let maxWaitTimer: ReturnType<typeof setTimeout> | undefined;
    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (maxWaitTimer) clearTimeout(maxWaitTimer);
      maxWaitTimer = undefined;
      refreshRef.current();
    };
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fire, 150);
      // A sustained burst of events keeps resetting the 150ms debounce, so
      // without a ceiling the refetch never fires. Force one at least once
      // per second while events keep arriving.
      if (!maxWaitTimer) maxWaitTimer = setTimeout(fire, 1000);
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
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setConnection({ retryKey: retryToken, status: 'connected', teamId });
          refresh();
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          logger.warn('realtime.today.degraded', { teamId, status });
          if (err)
            logger.error('realtime.today.error', err, { teamId, status });
          setConnection({ retryKey: retryToken, status: 'degraded', teamId });
        }
      });
    return () => {
      if (timer) clearTimeout(timer);
      if (maxWaitTimer) clearTimeout(maxWaitTimer);
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
