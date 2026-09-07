export function buildAppUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${normalized}`;
}

export async function shareLink(options: {
  text: string;
  title: string;
  url: string;
}) {
  if (typeof navigator.share === 'function') {
    await navigator.share(options);
    return 'shared' as const;
  }

  if (typeof navigator.clipboard?.writeText === 'function') {
    await navigator.clipboard.writeText(options.url);
    return 'copied' as const;
  }

  throw new Error('Share and clipboard are not available.');
}
