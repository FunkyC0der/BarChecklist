import { createContext, useContext, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-context';
import { useTeams } from '@/features/teams/team-context';
import {
  useTeamRealtime,
  type TeamRealtimeStatus,
} from '@/features/teams/use-team-realtime';
import { queryKeys } from '@/lib/query-client';

type TeamRealtimeContextValue = {
  retry: () => void;
  status: TeamRealtimeStatus;
};

const TeamRealtimeContext = createContext<TeamRealtimeContextValue | null>(
  null,
);

/**
 * Owns the team realtime channel at the app-shell level (a parent of the
 * per-tab Outlet) so it survives tab navigation instead of tearing down and
 * reconnecting — and flashing the "connecting" banner — every time the Team
 * tab remounts.
 */
export function TeamRealtimeProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { activeTeam, refreshTeams } = useTeams();
  const queryClient = useQueryClient();
  const teamId = activeTeam?.id ?? null;
  const isOwner = Boolean(
    activeTeam && session?.user.id === activeTeam.owner_id,
  );

  const { retry, status } = useTeamRealtime({
    isOwner,
    onInviteChange: () =>
      void queryClient.invalidateQueries({
        queryKey: queryKeys.teamInvite(teamId ?? 'none'),
      }),
    onMembersChange: () =>
      void queryClient.invalidateQueries({
        queryKey: queryKeys.teamMembers(teamId ?? 'none'),
      }),
    onTeamChange: () => void refreshTeams(),
    teamId,
  });

  return (
    <TeamRealtimeContext.Provider value={{ retry, status }}>
      {children}
    </TeamRealtimeContext.Provider>
  );
}

export function useTeamRealtimeStatus() {
  const value = useContext(TeamRealtimeContext);
  if (!value) {
    throw new Error(
      'useTeamRealtimeStatus must be used within TeamRealtimeProvider.',
    );
  }
  return value;
}
