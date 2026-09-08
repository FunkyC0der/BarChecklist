import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { getPublicEnvIssue } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/query-client';

import { fetchTeams, type Team } from './team-api';
import {
  readStoredActiveTeam,
  resolveActiveTeamId,
  writeStoredActiveTeam,
} from './team-storage';

type TeamStatus = 'error' | 'idle' | 'loading' | 'ready';

type TeamContextValue = {
  activeTeam: Team | null;
  error: string | null;
  refreshTeams: (preferredTeamId?: string) => Promise<Team[]>;
  selectTeam: (teamId: string | null) => void;
  status: TeamStatus;
  teams: Team[];
};

const TeamContext = createContext<TeamContextValue | null>(null);
const emptyTeams: Team[] = [];

export function TeamProvider({ children }: { children: ReactNode }) {
  const { configIssue, session } = useAuth();
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const teamsQuery = useQuery({
    enabled: Boolean(userId && !configIssue),
    queryFn: fetchTeams,
    queryKey: queryKeys.teams(userId ?? 'anonymous'),
  });
  const teams = teamsQuery.data ?? emptyTeams;
  const status: TeamStatus = !userId
    ? 'idle'
    : configIssue || teamsQuery.isSuccess
      ? 'ready'
      : teamsQuery.isLoading
        ? 'loading'
        : teamsQuery.isError
          ? 'error'
          : 'idle';
  const error =
    teamsQuery.error instanceof Error ? teamsQuery.error.message : null;

  const refreshTeams = useCallback(
    async (preferredTeamId?: string) => {
      if (!session) {
        setActiveTeamId(null);
        return [];
      }

      if (configIssue) {
        setActiveTeamId(null);
        return [];
      }
      try {
        await queryClient.refetchQueries({
          queryKey: queryKeys.teams(session.user.id),
        });
        const nextTeams =
          queryClient.getQueryData<Team[]>(queryKeys.teams(session.user.id)) ??
          [];
        const nextActiveId = resolveActiveTeamId(
          readStoredActiveTeam(session.user.id),
          nextTeams,
          preferredTeamId,
        );
        setActiveTeamId(nextActiveId);
        writeStoredActiveTeam(session.user.id, nextActiveId);
        return nextTeams;
      } catch (nextError) {
        void nextError;
        return [];
      }
    },
    [configIssue, queryClient, session],
  );

  useEffect(() => {
    if (!session || configIssue || getPublicEnvIssue()) return;

    const channel = getSupabase()
      .channel(`my-teams:${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () =>
          void queryClient.invalidateQueries({
            queryKey: queryKeys.teams(session.user.id),
          }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members' },
        () =>
          void queryClient.invalidateQueries({
            queryKey: queryKeys.teams(session.user.id),
          }),
      )
      .subscribe();

    return () => {
      void getSupabase().removeChannel(channel);
    };
  }, [configIssue, queryClient, session]);

  const selectTeam = useCallback(
    (teamId: string | null) => {
      const resolvedTeamId = resolveActiveTeamId(teamId, teams);
      setActiveTeamId(resolvedTeamId);
      if (session) writeStoredActiveTeam(session.user.id, resolvedTeamId);
    },
    [session, teams],
  );

  const resolvedActiveTeamId = resolveActiveTeamId(
    activeTeamId && teams.some((team) => team.id === activeTeamId)
      ? activeTeamId
      : userId
        ? readStoredActiveTeam(userId)
        : null,
    teams,
  );
  const activeTeam =
    teams.find((team) => team.id === resolvedActiveTeamId) ?? null;
  useEffect(() => {
    if (!userId || !teamsQuery.isSuccess) return;
    if (readStoredActiveTeam(userId) !== resolvedActiveTeamId) {
      writeStoredActiveTeam(userId, resolvedActiveTeamId);
    }
  }, [resolvedActiveTeamId, teamsQuery.isSuccess, userId]);
  const value = useMemo(
    () => ({ activeTeam, error, refreshTeams, selectTeam, status, teams }),
    [activeTeam, error, refreshTeams, selectTeam, status, teams],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeams() {
  const value = useContext(TeamContext);
  if (!value) throw new Error('useTeams must be used within TeamProvider.');
  return value;
}
