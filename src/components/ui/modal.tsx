import { Dialog } from '@base-ui/react/dialog';
import { useState, type ReactNode, type RefObject } from 'react';

import {
  floatingPopupBoxClass,
  floatingPopupDialogClass,
} from './bottom-surface';
import { useSheetViewport } from './sheet-viewport';
import { cn } from '@/lib/cn';

export function Modal({
  children,
  description,
  onClose,
  open,
  title,
  triggerRef,
}: {
  children: ReactNode;
  description?: string | undefined;
  onClose: () => void;
  open: boolean;
  title: string;
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
            className={`${floatingPopupBoxClass} app-overlay-popup`}
            finalFocus={triggerRef}
            initialFocus
            ref={setBox}
          >
            <Dialog.Title className="text-2xl font-bold tracking-tight">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="py-4">
                {description}
              </Dialog.Description>
            ) : null}
            {children}
            <Dialog.Close className="sr-only focus-visible:btn focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:right-3 focus-visible:btn-ghost focus-visible:btn-sm">
              Закрити
            </Dialog.Close>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
