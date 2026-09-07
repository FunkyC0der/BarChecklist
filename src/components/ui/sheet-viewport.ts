import { useEffect, type RefObject } from 'react';

const focusGap = 12;
const textInputTypes = new Set([
  'text',
  'search',
  'email',
  'password',
  'tel',
  'url',
  'number',
]);

function revealFocusedEditor(box: HTMLElement, viewport: VisualViewport) {
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

    const bounds = scroller.getBoundingClientRect();
    const scrollTop = bounds.top + scroller.clientTop;
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
    const delta =
      field.top < visibleTop || field.height > visibleBottom - visibleTop
        ? field.top - visibleTop
        : Math.max(0, field.bottom - visibleBottom);

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

export function useSheetViewport(
  dialogRef: RefObject<HTMLDialogElement | null>,
  boxRef: RefObject<HTMLDivElement | null>,
  open: boolean,
) {
  useEffect(() => {
    const dialog = dialogRef.current;
    const box = boxRef.current;
    const viewport = window.visualViewport;
    if (!open || !dialog || !box || !viewport) return;

    let frame: number | undefined;
    const update = () => {
      frame = undefined;
      if (!dialog.open) return;

      // iOS shrinks/pans the visual viewport while a fixed dialog still occupies
      // the layout viewport. Move its bottom anchor as well as limiting the box.
      dialog.style.top = `${viewport.offsetTop}px`;
      dialog.style.height = `${viewport.height}px`;
      dialog.style.bottom = 'auto';
      box.style.maxHeight = `min(90dvh, ${viewport.height}px)`;
      revealFocusedEditor(box, viewport);
    };
    const scheduleUpdate = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      // Focus precedes keyboard layout. Measure in a frame after native focus
      // scrolling; later resize/scroll events repeat this as Safari settles.
      frame = requestAnimationFrame(update);
    };

    scheduleUpdate();
    dialog.addEventListener('focusin', scheduleUpdate);
    viewport.addEventListener('resize', scheduleUpdate);
    viewport.addEventListener('scroll', scheduleUpdate);
    // The opening transition can finish after the last keyboard viewport event.
    box.addEventListener('transitionend', scheduleUpdate);

    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      dialog.removeEventListener('focusin', scheduleUpdate);
      viewport.removeEventListener('resize', scheduleUpdate);
      viewport.removeEventListener('scroll', scheduleUpdate);
      box.removeEventListener('transitionend', scheduleUpdate);
      dialog.style.removeProperty('top');
      dialog.style.removeProperty('height');
      dialog.style.removeProperty('bottom');
      box.style.removeProperty('max-height');
    };
  }, [boxRef, dialogRef, open]);
}
