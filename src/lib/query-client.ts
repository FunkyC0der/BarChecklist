import { QueryClient } from '@tanstack/react-query';

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
};

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 15_000 },
      mutations: { retry: false },
    },
  });
}
