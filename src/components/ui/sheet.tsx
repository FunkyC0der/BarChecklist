import { useEffect, useId, useRef, type ReactNode } from 'react';

import {
  floatingPopupBoxClass,
  floatingPopupDialogClass,
} from './bottom-surface';
import { useSheetViewport } from './sheet-viewport';

export function Sheet({
  ariaLabel,
  children,
  description,
  more,
  onClose,
  open,
  title,
}: {
  ariaLabel?: string | undefined;
  children: ReactNode;
  description?: string | undefined;
  more?: ReactNode;
  onClose: () => void;
  open: boolean;
  title?: string | undefined;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useSheetViewport(dialogRef, boxRef, open);

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-label={!title ? ariaLabel : undefined}
      aria-labelledby={title ? titleId : undefined}
      className={floatingPopupDialogClass}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className={floatingPopupBoxClass} ref={boxRef}>
        {title || more ? (
          <div className="flex items-start justify-between gap-3">
            {title ? (
              <h2 className="text-2xl font-bold tracking-tight" id={titleId}>
                {title}
              </h2>
            ) : (
              <span />
            )}
            {more ? <div className="shrink-0">{more}</div> : null}
          </div>
        ) : null}
        {description ? (
          <p className="mt-1 text-sm text-base-content/60" id={descriptionId}>
            {description}
          </p>
        ) : null}
        <div className={title || description || more ? 'mt-4' : undefined}>
          {children}
        </div>
      </div>
      <form className="modal-backdrop" method="dialog">
        <button type="submit">Закрити</button>
      </form>
    </dialog>
  );
}
