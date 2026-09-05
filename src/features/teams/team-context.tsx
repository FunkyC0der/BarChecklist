import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { getPublicEnvIssue } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';

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

export function TeamProvider({ children }: { children: ReactNode }) {
  const { configIssue, session } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [status, setStatus] = useState<TeamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const hasLoadedTeams = useRef(false);

  const refreshTeams = useCallback(
    async (preferredTeamId?: string) => {
      if (!session || configIssue) {
        setTeams([]);
        setActiveTeamId(null);
        setStatus('ready');
        hasLoadedTeams.current = false;
        return [];
      }

      const isInitialLoad = !hasLoadedTeams.current;
      if (isInitialLoad) setStatus('loading');
      setError(null);
      try {
        const nextTeams = await fetchTeams();
        const nextActiveId = resolveActiveTeamId(
          readStoredActiveTeam(session.user.id),
          nextTeams,
          preferredTeamId,
        );
        setTeams(nextTeams);
        setActiveTeamId(nextActiveId);
        writeStoredActiveTeam(session.user.id, nextActiveId);
        hasLoadedTeams.current = true;
        setStatus('ready');
        return nextTeams;
      } catch (nextError) {
        if (!isInitialLoad) {
          setStatus('ready');
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Не вдалося оновити команди.',
          );
          return [];
        }

        setTeams([]);
        setActiveTeamId(null);
        setStatus('error');
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Не вдалося завантажити команди.',
        );
        return [];
      }
    },
    [configIssue, session],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshTeams();
    }, 0);

    return () => clearTimeout(timer);
  }, [refreshTeams]);

  useEffect(() => {
    if (!session || configIssue || getPublicEnvIssue()) return;

    const channel = getSupabase()
      .channel(`my-teams:${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => void refreshTeams(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members' },
        () => void refreshTeams(),
      )
      .subscribe();

    return () => {
      void getSupabase().removeChannel(channel);
    };
  }, [configIssue, refreshTeams, session]);

  const selectTeam = useCallback(
    (teamId: string | null) => {
      const resolvedTeamId = resolveActiveTeamId(teamId, teams);
      setActiveTeamId(resolvedTeamId);
      if (session) writeStoredActiveTeam(session.user.id, resolvedTeamId);
    },
    [session, teams],
  );

  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? null;
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
