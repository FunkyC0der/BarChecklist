const inviteTokenPattern = /^[a-f0-9]{64}$/;

export function joinPath(token: string) {
  return `/join/${token}`;
}

export function safeJoinReturnPath(value: string | string[] | undefined) {
  if (typeof value !== 'string') return null;

  const match = /^\/join\/([a-f0-9]{64})$/.exec(value);
  return match && inviteTokenPattern.test(match[1] ?? '') ? value : null;
}

export function isInviteToken(
  value: string | string[] | undefined,
): value is string {
  return typeof value === 'string' && inviteTokenPattern.test(value);
}
