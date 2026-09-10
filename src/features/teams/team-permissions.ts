import { useAuth } from '@/features/auth/auth-context';

import { useTeams } from './team-context';
import type { Team } from './team-api';

export function getTeamPermissions(team: Team | null, userId?: string) {
  const isOwner = Boolean(team && userId === team.owner_id);
  // `myRole` is absent in older fixture data; retain their owner-only behavior.
  const isAdmin = Boolean(team && !isOwner && team.myRole === 'admin');
  return { canManage: isOwner || isAdmin, isAdmin, isOwner };
}

export function useTeamPermissions() {
  const { session } = useAuth();
  const { activeTeam } = useTeams();
  return getTeamPermissions(activeTeam, session?.user.id);
}
