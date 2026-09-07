import type { Database } from '@/types/database.generated';

type Team = Database['public']['Tables']['teams']['Row'];

function storageKey(userId: string) {
  return `checklister.active-team.${userId}`;
}

export function resolveActiveTeamId(
  storedTeamId: string | null,
  teams: Team[],
  preferredTeamId?: string,
): string | null {
  if (preferredTeamId && teams.some((team) => team.id === preferredTeamId)) {
    return preferredTeamId;
  }

  if (storedTeamId && teams.some((team) => team.id === storedTeamId)) {
    return storedTeamId;
  }

  return teams[0]?.id ?? null;
}

export function readStoredActiveTeam(userId: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export function writeStoredActiveTeam(userId: string, teamId: string | null) {
  if (typeof window === 'undefined') return;

  try {
    const key = storageKey(userId);
    if (teamId) {
      window.localStorage.setItem(key, teamId);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage can be disabled in the browser. The in-memory selection still works.
  }
}
