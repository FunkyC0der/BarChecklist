import { afterEach, describe, expect, it, vi } from 'vitest';

import { shareLink } from './platform';

const options = {
  text: 'Приєднуйтесь до команди.',
  title: 'Запрошення',
  url: 'https://example.test/join/secret',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shareLink', () => {
  it('uses Web Share when it is available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { clipboard: { writeText }, share });

    await expect(shareLink(options)).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(options);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('preserves a user cancellation without copying', async () => {
    const abortError = new DOMException('Cancelled', 'AbortError');
    const share = vi.fn().mockRejectedValue(abortError);
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { clipboard: { writeText }, share });

    await expect(shareLink(options)).rejects.toBe(abortError);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('does not hide a native-share failure behind clipboard fallback', async () => {
    const shareError = new Error('Native share failed');
    const share = vi.fn().mockRejectedValue(shareError);
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { clipboard: { writeText }, share });

    await expect(shareLink(options)).rejects.toBe(shareError);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies only the URL when Web Share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(shareLink(options)).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith(options.url);
  });

  it('reports an error when neither sharing path is available', async () => {
    vi.stubGlobal('navigator', {});

    await expect(shareLink(options)).rejects.toThrow(
      'Share and clipboard are not available.',
    );
  });
});
