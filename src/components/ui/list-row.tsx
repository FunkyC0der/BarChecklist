import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';

export function TaskMarker({ className }: { className?: string | undefined }) {
  return (
    <span
      className={cn(
        'mt-0.5 size-5 shrink-0 rounded-full border-2 border-base-300',
        className,
      )}
    />
  );
}

export function IconTile({
  className,
  icon,
}: {
  className?: string | undefined;
  icon: IconName;
}) {
  return (
    <span
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-full bg-base-200',
        className,
      )}
    >
      <Icon name={icon} />
    </span>
  );
}

export function ListRow({
  leading,
  meta,
  onClick,
  title,
  to,
  trailing,
}: {
  leading?: ReactNode;
  meta?: ReactNode;
  onClick?: (() => void) | undefined;
  title: ReactNode;
  to?: string | undefined;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      {leading}
      <div className={cn((to || onClick) && 'list-col-grow')}>
        <div className="text-base">{title}</div>
        {meta ? (
          <div className="mt-0.5 flex items-center gap-1.5 text-sm text-base-content/60">
            {meta}
          </div>
        ) : null}
      </div>
      {trailing}
    </>
  );

  const rowClass = 'list-row min-h-14 items-start px-0';
  // daisyUI supports `.list > li .list-row`, so the link/button itself is the
  // grid row: it stays in the a11y tree and gets native tap/focus feedback.
  const interactiveRow = cn(
    rowClass,
    'w-full text-start transition-colors active:bg-base-200',
    'focus-visible:outline-2 focus-visible:outline-primary',
  );

  if (to) {
    return (
      <li>
        <Link className={interactiveRow} to={to}>
          {content}
        </Link>
      </li>
    );
  }

  if (onClick) {
    return (
      <li>
        <button className={interactiveRow} onClick={onClick} type="button">
          {content}
        </button>
      </li>
    );
  }

  return <li className={rowClass}>{content}</li>;
}
