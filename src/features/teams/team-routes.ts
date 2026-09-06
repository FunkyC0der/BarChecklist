const inviteTokenPattern = /^[a-f0-9]{64}$/;

export function joinPath(token: string) {
  return `/join/${token}`;
}

export function safeJoinReturnPath(
  value: string | string[] | null | undefined,
) {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/')) return null;

  try {
    const url = new URL(value, 'https://bar-checklist.invalid');
    if (url.origin !== 'https://bar-checklist.invalid') return null;

    const inviteMatch = /^\/join\/([a-f0-9]{64})$/.exec(url.pathname);
    const isKnownProductPath =
      url.pathname === '/onboarding' ||
      url.pathname === '/today' ||
      url.pathname === '/checklists' ||
      /^\/checklists\/[^/]+$/.test(url.pathname) ||
      url.pathname === '/history' ||
      url.pathname === '/team';

    if (
      !(inviteMatch && inviteTokenPattern.test(inviteMatch[1] ?? '')) &&
      !isKnownProductPath
    ) {
      return null;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function isInviteToken(
  value: string | string[] | null | undefined,
): value is string {
  return typeof value === 'string' && inviteTokenPattern.test(value);
}
