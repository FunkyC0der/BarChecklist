const teamTabPaths = ['/today', '/checklists', '/history', '/team'] as const;

export type TeamTabPath = (typeof teamTabPaths)[number];

function storageKey(userId: string) {
  return `bar-checklist.active-tab.${userId}`;
}

export function isTeamTabPath(pathname: string): pathname is TeamTabPath {
  return teamTabPaths.some((path) => path === pathname);
}

export function resolveTeamTabRoot(pathname: string): TeamTabPath | null {
  for (const path of teamTabPaths) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return path;
  }
  return null;
}

export function resolveActiveTeamTab(
  storedPath: string | null,
  pathname: string,
): string {
  const currentRoot = resolveTeamTabRoot(pathname);
  if (currentRoot) return pathname;

  const storedRoot = storedPath ? resolveTeamTabRoot(storedPath) : null;
  if (storedRoot) return storedRoot;
  return '/today';
}

export function readStoredActiveTeamTab(userId: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export function writeStoredActiveTeamTab(
  userId: string,
  pathname: TeamTabPath,
) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey(userId), pathname);
  } catch {
    // Storage can be disabled in the browser. Navigation still remains usable.
  }
}
