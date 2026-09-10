import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { normalizeError } from './log-error';
import { logger } from './logger';

export const queryKeys = {
  teams: (userId: string) => ['teams', userId] as const,
  teamMembers: (teamId: string) => ['team', teamId, 'members'] as const,
  teamInvite: (teamId: string) => ['team', teamId, 'invite'] as const,
  checklists: (teamId: string) => ['checklists', teamId] as const,
  checklistList: (teamId: string) => ['checklists', teamId, 'list'] as const,
  checklist: (teamId: string, checklistId: string) =>
    ['checklist', teamId, checklistId] as const,
  today: (teamId: string, logicalDate: string) =>
    ['today', teamId, logicalDate] as const,
  todayForTeam: (teamId: string) => ['today', teamId] as const,
  history: (teamId: string, filters: Record<string, unknown>) =>
    ['history', teamId, filters] as const,
  historyOptions: (teamId: string) => ['history', teamId, 'options'] as const,
  historyForTeam: (teamId: string) => ['history', teamId] as const,
  memberStats: (teamId: string, filters: Record<string, unknown>) =>
    ['stats', teamId, 'members', filters] as const,
  memberTaskStats: (
    teamId: string,
    userId: string,
    filters: Record<string, unknown>,
  ) => ['stats', teamId, 'member', userId, filters] as const,
  statsForTeam: (teamId: string) => ['stats', teamId] as const,
  superAdminFlag: (userId: string) =>
    ['admin', userId, 'is-super-admin'] as const,
  adminOverview: () => ['admin', 'overview'] as const,
  adminTeams: (params: Record<string, unknown>) =>
    ['admin', 'teams', params] as const,
};

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // A permission or validation failure (RLS denial, bad input) will
      // never succeed on retry — only a transient network error might.
      // Retrying blindly (the old `retry: 1`) doubled every 42501 rejection.
      queries: {
        gcTime: 30 * 60_000,
        retry: (count, error) =>
          count < 1 && normalizeError(error).kind === 'network',
        staleTime: 15_000,
      },
      mutations: { retry: false },
    },
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        logger.error('query-client.mutation-failed', error, {
          mutationKey: JSON.stringify(mutation.options.mutationKey ?? []),
        });
      },
    }),
    queryCache: new QueryCache({
      onError: (error, query) => {
        logger.error('query-client.query-failed', error, {
          queryKey: JSON.stringify(query.queryKey),
        });
      },
    }),
  });
}
