import { useEffect } from 'react';

import { getPublicEnvIssue } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';

type TeamRealtimeOptions = {
  isOwner: boolean;
  onInviteChange: () => void;
  onMembersChange: () => void;
  onTeamChange: () => void;
  teamId: string | null;
};

export function useTeamRealtime({
  isOwner,
  onInviteChange,
  onMembersChange,
  onTeamChange,
  teamId,
}: TeamRealtimeOptions) {
  useEffect(() => {
    if (!teamId || getPublicEnvIssue()) return;

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
        onTeamChange,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `team_id=eq.${teamId}`,
          schema: 'public',
          table: 'team_members',
        },
        onMembersChange,
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
        onInviteChange,
      );
    }

    channel.subscribe();

    return () => {
      void getSupabase().removeChannel(channel);
    };
  }, [isOwner, onInviteChange, onMembersChange, onTeamChange, teamId]);
}
