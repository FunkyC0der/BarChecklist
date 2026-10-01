import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installIosViewportReset } from './ios-viewport';

describe('installIosViewportReset', () => {
  let cleanup: () => void;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.mocked(window.scrollTo).mockClear();
    document.body.innerHTML =
      '<input id="a" /><input id="b" /><button id="c">x</button>';
    cleanup = installIosViewportReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('scrolls to the origin when a field loses focus to a non-field', () => {
    const a = document.getElementById('a') as HTMLInputElement;
    a.focus();
    a.blur();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('does nothing when focus moves to another field', () => {
    const a = document.getElementById('a') as HTMLInputElement;
    const b = document.getElementById('b') as HTMLInputElement;
    a.focus();
    b.focus();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
