import { useEffect, useRef, type ReactNode } from 'react';

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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog className="modal" onClose={onClose} ref={dialogRef}>
      <div className="modal-box">
        <h3 className="text-lg font-bold">{title}</h3>
        {description ? <p className="py-3">{description}</p> : null}
        {children}
      </div>
      <form className="modal-backdrop" method="dialog">
        <button type="submit">close</button>
      </form>
    </dialog>
  );
}
