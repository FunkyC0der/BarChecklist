import { useEffect, useId, useRef, type ReactNode } from 'react';

import { IconButton } from './icon-button';

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
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-label={!title ? ariaLabel : undefined}
      aria-labelledby={title ? titleId : undefined}
      className="modal modal-bottom sm:modal-middle"
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="modal-box max-h-[90dvh] overflow-y-auto rounded-t-box p-0 sm:rounded-box">
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-10 rounded-full bg-base-300"
        />
        <div className="flex items-center justify-between px-2 pt-1">
          <IconButton icon="x" label="Закрити" onClick={onClose} />
          <div>{more}</div>
        </div>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {title ? (
            <h2 className="text-lg font-semibold" id={titleId}>
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="text-sm text-base-content/60" id={descriptionId}>
              {description}
            </p>
          ) : null}
          {children}
        </div>
      </div>
      <form className="modal-backdrop" method="dialog">
        <button type="submit">close</button>
      </form>
    </dialog>
  );
}
