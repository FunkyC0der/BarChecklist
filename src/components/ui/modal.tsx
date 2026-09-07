import { useEffect, useId, useRef, type ReactNode } from 'react';

export function Modal({
  children,
  description,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  description?: string | undefined;
  onClose: () => void;
  open: boolean;
  title: string;
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
      aria-labelledby={titleId}
      className="modal modal-bottom sm:modal-middle"
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="modal-box">
        <h3 className="text-2xl font-bold tracking-tight" id={titleId}>
          {title}
        </h3>
        {description ? (
          <p className="py-4" id={descriptionId}>
            {description}
          </p>
        ) : null}
        {children}
      </div>
      <form className="modal-backdrop" method="dialog">
        <button type="submit">Закрити</button>
      </form>
    </dialog>
  );
}
