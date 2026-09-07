import { cn } from '@/lib/cn';

import { Icon } from './icon';

export function Fab({
  disabled = false,
  disabledHint,
  label,
  onClick,
}: {
  disabled?: boolean | undefined;
  disabledHint?: string | undefined;
  label: string;
  onClick: () => void;
}) {
  const button = (
    <button
      aria-label={label}
      className="btn btn-circle transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] btn-lg btn-primary active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon name="plus" />
    </button>
  );

  return (
    <div
      className={cn(
        // Fixed on phones; on wider screens anchor inside the max-w-md column.
        'fab fixed right-4 z-30 sm:absolute',
        'bottom-[calc(4.5rem+max(0.75rem,env(safe-area-inset-bottom)))]',
      )}
    >
      {disabled && disabledHint ? (
        <div className="tooltip tooltip-left" data-tip={disabledHint}>
          {button}
        </div>
      ) : (
        button
      )}
    </div>
  );
}
