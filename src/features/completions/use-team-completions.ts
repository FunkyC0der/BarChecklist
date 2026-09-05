import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useEffect } from 'react';

import { getPublicEnvIssue } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database.generated';

type Completion = Database['public']['Tables']['task_completions']['Row'];

export function useTeamCompletions(
  teamId: string | null,
  onChange: (payload: RealtimePostgresChangesPayload<Completion>) => void,
) {
  useEffect(() => {
    if (!teamId || getPublicEnvIssue()) return;

    const channel = getSupabase()
      .channel(`team-completions:${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `team_id=eq.${teamId}`,
          schema: 'public',
          table: 'task_completions',
        },
        onChange,
      )
      .subscribe();

    return () => {
      void getSupabase().removeChannel(channel);
    };
  }, [onChange, teamId]);
}
