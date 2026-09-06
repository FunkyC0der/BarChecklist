import { useCallback, useEffect, useRef, useState } from 'react';

import { getPublicEnvIssue } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';

type TeamRealtimeOptions = {
  isOwner: boolean;
  onInviteChange: () => void;
  onMembersChange: () => void;
  onTeamChange: () => void;
  teamId: string | null;
};

export type TeamRealtimeStatus = 'connecting' | 'connected' | 'degraded';

export function useTeamRealtime({
  isOwner,
  onInviteChange,
  onMembersChange,
  onTeamChange,
  teamId,
}: TeamRealtimeOptions) {
  const [connection, setConnection] = useState<{
    retryKey: number;
    status: TeamRealtimeStatus;
    teamId: string;
  } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const callbacks = useRef({ onInviteChange, onMembersChange, onTeamChange });

  useEffect(() => {
    callbacks.current = { onInviteChange, onMembersChange, onTeamChange };
  }, [onInviteChange, onMembersChange, onTeamChange]);

  const retry = useCallback(() => {
    setRetryKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!teamId || getPublicEnvIssue()) return;
    let active = true;
    const refreshCanonicalData = () => {
      callbacks.current.onTeamChange();
      callbacks.current.onMembersChange();
      if (isOwner) callbacks.current.onInviteChange();
    };

    const channel = getSupabase()
      .channel(`team:${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `id=eq.${teamId}`,
          schema: 'public',
          table: 'teams',
        },
        () => callbacks.current.onTeamChange(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `team_id=eq.${teamId}`,
          schema: 'public',
          table: 'team_members',
        },
        () => callbacks.current.onMembersChange(),
      );

    if (isOwner) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          filter: `team_id=eq.${teamId}`,
          schema: 'public',
          table: 'team_invites',
        },
        () => callbacks.current.onInviteChange(),
      );
    }

    channel.subscribe((nextStatus) => {
      if (!active) return;
      setConnection({
        retryKey,
        status: nextStatus === 'SUBSCRIBED' ? 'connected' : 'degraded',
        teamId,
      });
    });

    const onOnline = () => {
      if (!active) return;
      refreshCanonicalData();
      retry();
    };
    window.addEventListener('online', onOnline);

    return () => {
      active = false;
      window.removeEventListener('online', onOnline);
      void getSupabase().removeChannel(channel);
    };
  }, [isOwner, retry, retryKey, teamId]);

  const status: TeamRealtimeStatus =
    !teamId || getPublicEnvIssue()
      ? 'degraded'
      : connection?.teamId === teamId && connection.retryKey === retryKey
        ? connection.status
        : 'connecting';

  return { retry, status };
}
