import { Dialog } from '@base-ui/react/dialog';
import { useState, type ReactNode, type RefObject } from 'react';

import {
  floatingPopupBoxClass,
  floatingPopupDialogClass,
} from './bottom-surface';
import { useSheetViewport } from './sheet-viewport';
import { cn } from '@/lib/cn';

/**
 * Base UI's Dialog restores focus on close to whatever element had DOM focus
 * when the dialog opened (`finalFocus`/`returnFocus` default to `true`).
 * That default only works if the trigger actually *has* focus at that
 * instant — but a plain `<button onClick>` is not reliably focused by a
 * pointer click: Safari and Firefox do not focus buttons on click (only
 * Chromium does), so `document.activeElement` stays on `<body>` and the
 * dialog has nothing valid to restore focus to when it closes.
 *
 * DO NOT "fix" this by re-adding an app-wide `pointerdown` listener that
 * calls `.focus()` on whatever button was pressed. An earlier version of
 * this file did exactly that (installed once, globally, on the first Sheet
 * mount, never removed) and it was rejected: it silently changed focus
 * behavior for every button in the app — dock items, list rows, the FAB —
 * to fix a Sheet-local problem, and forcing `.focus()` on every pointerdown
 * is the kind of thing that can perturb scroll position / the visual
 * viewport on iOS (see `./sheet-viewport.ts`).
 *
 * The correct fix is narrower: base UI's `Dialog.Popup` accepts an explicit
 * `finalFocus` ref. When given one, it restores focus to that element on
 * close *regardless* of what `document.activeElement` was when the dialog
 * opened, so it doesn't depend on the browser having focused the trigger at
 * all. Callers that open a Sheet pass a `triggerRef` and record the pressed
 * element into it (`triggerRef.current = event.currentTarget`) in their own
 * click handler — no document-level listener, no effect on any element
 * that isn't actually a trigger for this Sheet.
 */
export function Sheet({
  ariaLabel,
  children,
  description,
  more,
  onClose,
  open,
  title,
  triggerRef,
}: {
  ariaLabel?: string | undefined;
  children: ReactNode;
  description?: string | undefined;
  more?: ReactNode;
  onClose: () => void;
  open: boolean;
  title?: string | undefined;
  triggerRef?: RefObject<HTMLElement | null> | undefined;
}) {
  const [dialog, setDialog] = useState<HTMLDivElement | null>(null);
  const [box, setBox] = useState<HTMLDivElement | null>(null);

  useSheetViewport(dialog, box, open);

  return (
    <Dialog.Root
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      open={open}
    >
      <Dialog.Portal>
        <Dialog.Viewport
          className={cn(
            floatingPopupDialogClass,
            'app-overlay-surface',
            open && 'modal-open',
          )}
          ref={setDialog}
        >
          <Dialog.Backdrop className="app-overlay-backdrop modal-backdrop" />
          <Dialog.Popup
            aria-label={!title ? ariaLabel : undefined}
            className={`${floatingPopupBoxClass} app-overlay-popup`}
            finalFocus={triggerRef}
            initialFocus
            ref={setBox}
          >
            {title || more ? (
              <div className="flex items-start justify-between gap-3">
                {title ? (
                  <Dialog.Title className="text-2xl font-bold tracking-tight">
                    {title}
                  </Dialog.Title>
                ) : (
                  <span />
                )}
                {more ? <div className="shrink-0">{more}</div> : null}
              </div>
            ) : null}
            {description ? (
              <Dialog.Description className="mt-1 text-sm text-base-content/60">
                {description}
              </Dialog.Description>
            ) : null}
            <div className={title || description || more ? 'mt-4' : undefined}>
              {children}
            </div>
            <Dialog.Close className="sr-only focus-visible:btn focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:right-3 focus-visible:btn-ghost focus-visible:btn-sm">
              Закрити
            </Dialog.Close>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
