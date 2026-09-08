import { useEffect } from 'react';

const focusGap = 12;
const keyboardGap = 12;
const keyboardThreshold = 80;
// Below this, a keyboard-inset change is treated as live 1:1 tracking even
// during a 'resize': too small to be worth animating, and instant keeps the
// sheet from visibly lagging tiny visualViewport jitter.
const keyboardDeltaThreshold = 40;
// iOS often fires 'scroll' right behind 'resize', before the CSS transition
// settles. Keep animating through this window so the pan doesn't fight the
// still-running transition with a visible seam.
const trackingSmoothingWindow = 250;
const textInputTypes = new Set([
  'text',
  'search',
  'email',
  'password',
  'tel',
  'url',
  'number',
]);

function revealFocusedEditor(
  box: HTMLElement,
  viewport: VisualViewport,
  pendingShift: number,
) {
  const editor = document.activeElement;
  if (
    !(editor instanceof HTMLElement) ||
    !box.contains(editor) ||
    !(
      (editor instanceof HTMLInputElement && textInputTypes.has(editor.type)) ||
      editor instanceof HTMLTextAreaElement ||
      editor.isContentEditable
    )
  ) {
    return;
  }

  // Scroll inside the sheet only: scrolling the document can make Safari pan its
  // visual viewport again. Work outwards so nested scroll areas reveal the field.
  for (
    let scroller = editor.parentElement;
    scroller && box.contains(scroller);
    scroller = scroller.parentElement
  ) {
    if (
      scroller.scrollHeight <= scroller.clientHeight ||
      (scroller !== box &&
        !/auto|scroll|hidden/.test(getComputedStyle(scroller).overflowY))
    ) {
      continue;
    }

    // Rects reflect the surface's current transform, not the one just applied
    // to it. `pendingShift` (0 on immediate paths) corrects them to the final
    // position so scroll math lands where the sheet is actually headed.
    const bounds = scroller.getBoundingClientRect();
    const scrollTop = bounds.top + scroller.clientTop - pendingShift;
    const scrollBottom = scrollTop + scroller.clientHeight;
    // An inner scroller can start entirely below the viewport. Reveal the field
    // in that scroller first, then bring it into the viewport at the outer box.
    const top =
      scroller === box ? Math.max(scrollTop, viewport.offsetTop) : scrollTop;
    const bottom =
      scroller === box
        ? Math.min(scrollBottom, viewport.offsetTop + viewport.height)
        : scrollBottom;
    const gap = Math.min(focusGap, Math.max(0, (bottom - top) / 4));
    const visibleTop = top + gap;
    const visibleBottom = bottom - gap;
    if (visibleBottom <= visibleTop) continue;

    const field = editor.getBoundingClientRect();
    const fieldTop = field.top - pendingShift;
    const fieldBottom = field.bottom - pendingShift;
    const delta =
      fieldTop < visibleTop || field.height > visibleBottom - visibleTop
        ? fieldTop - visibleTop
        : Math.max(0, fieldBottom - visibleBottom);

    if (delta !== 0) {
      // An immediate scroll avoids competing with the keyboard animation and
      // also respects reduced motion. Clamp explicitly for nested containers.
      scroller.scrollTop = Math.max(
        0,
        Math.min(
          scroller.scrollTop + delta,
          scroller.scrollHeight - scroller.clientHeight,
        ),
      );
    }
  }
}

function getLayoutHeight() {
  return Math.max(document.documentElement.clientHeight, window.innerHeight);
}

function isKeyboardOpen(viewport: VisualViewport, layoutHeight: number) {
  // Browser chrome can alter the visual viewport slightly. A substantial
  // reduction is the cross-browser signal that the keyboard owns the bottom.
  return viewport.height < layoutHeight - keyboardThreshold;
}

export function useSheetViewport(
  dialog: HTMLElement | null,
  box: HTMLDivElement | null,
  open: boolean,
) {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!open || !dialog || !box || !viewport) return;

    let frame: number | undefined;
    let appliedInset = 0;
    let smoothUntil = 0;

    // `Dialog.Viewport` is `position: fixed; inset: 0` — pinned to the layout
    // viewport — while the visible area is the visual viewport's
    // [offsetTop, offsetTop + height]. This is the one offset that reconciles
    // them for both Android's keyboard resize and Safari's viewport pan.
    const update = (animated: boolean) => {
      frame = undefined;
      const layoutHeight = getLayoutHeight();
      const keyboardInset = Math.max(
        0,
        layoutHeight - (viewport.offsetTop + viewport.height),
      );
      const delta = Math.abs(keyboardInset - appliedInset);
      const now = performance.now();
      // Inside the window a transition is still running, so going live there
      // would snap the sheet from mid-flight to its target. Only a resize
      // opens the window, so a sustained pan cannot keep extending it.
      const live =
        now >= smoothUntil && (!animated || delta < keyboardDeltaThreshold);

      // Write the tracking mode before the variable it gates, so the browser
      // resolves the right transition before the value it applies to changes.
      if (live) {
        dialog.dataset.sheetTracking = 'live';
      } else {
        delete dialog.dataset.sheetTracking;
        if (animated) smoothUntil = now + trackingSmoothingWindow;
      }

      const pendingShift = live ? 0 : keyboardInset - appliedInset;
      appliedInset = keyboardInset;
      dialog.style.setProperty('--sheet-keyboard-inset', `${keyboardInset}px`);
      dialog.style.setProperty(
        '--sheet-viewport-height',
        `${viewport.height}px`,
      );
      if (isKeyboardOpen(viewport, layoutHeight)) {
        dialog.style.setProperty(
          '--sheet-bottom-clearance',
          `${keyboardGap}px`,
        );
      } else {
        dialog.style.removeProperty('--sheet-bottom-clearance');
      }
      revealFocusedEditor(box, viewport, pendingShift);
    };
    const scheduleUpdate = (animated: boolean) => () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      // Focus precedes keyboard layout. Measure in a frame after native focus
      // scrolling; later resize/scroll events repeat this as Safari settles.
      frame = requestAnimationFrame(() => update(animated));
    };
    const scheduleLive = scheduleUpdate(false);
    // Only a keyboard resize gets the CSS transition; scroll/focus/transition
    // events track the visual viewport 1:1 (see `live` above for exceptions).
    const scheduleAnimated = scheduleUpdate(true);

    scheduleLive();
    dialog.addEventListener('focusin', scheduleLive);
    viewport.addEventListener('resize', scheduleAnimated);
    viewport.addEventListener('scroll', scheduleLive);
    // The opening transition can finish after the last keyboard viewport event.
    box.addEventListener('transitionend', scheduleLive);

    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      dialog.removeEventListener('focusin', scheduleLive);
      viewport.removeEventListener('resize', scheduleAnimated);
      viewport.removeEventListener('scroll', scheduleLive);
      box.removeEventListener('transitionend', scheduleLive);
      dialog.style.removeProperty('--sheet-keyboard-inset');
      dialog.style.removeProperty('--sheet-viewport-height');
      dialog.style.removeProperty('--sheet-bottom-clearance');
      delete dialog.dataset.sheetTracking;
    };
  }, [box, dialog, open]);
}
