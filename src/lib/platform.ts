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
    return;
  }

  throw new Error('Share is not available.');
}
