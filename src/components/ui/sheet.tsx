import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

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
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateViewportHeight = () => setViewportHeight(viewport.height);
    updateViewportHeight();
    viewport.addEventListener('resize', updateViewportHeight);
    return () => viewport.removeEventListener('resize', updateViewportHeight);
  }, []);

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
      <div
        className="modal-box max-h-[90dvh] overflow-y-auto rounded-t-box px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-box"
        style={
          viewportHeight === null
            ? undefined
            : { maxHeight: `min(90dvh, ${viewportHeight}px)` }
        }
      >
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
