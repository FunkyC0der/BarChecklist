function isTextField(element: Element | null) {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
}

/** iOS 26 (WebKit 297779) leaves visualViewport offset/height shifted after
 * the keyboard closes, so fixed elements are drawn away from where they take
 * taps. The document never scrolls, so scrolling to the origin once a text
 * field has fully lost focus is safe and makes WebKit reset the viewport.
 * Returns a cleanup function. */
export function installIosViewportReset() {
  const onFocusOut = (event: FocusEvent) => {
    if (!isTextField(event.target as Element | null)) return;
    const next = event.relatedTarget as Element | null;
    if (isTextField(next)) return;
    requestAnimationFrame(() => {
      if (isTextField(document.activeElement)) return;
      window.scrollTo(0, 0);
    });
  };
  document.addEventListener('focusout', onFocusOut);
  return () => document.removeEventListener('focusout', onFocusOut);
}
