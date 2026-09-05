import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/cn';

import { Icon } from './icon';

export function Toolbar({
  actions,
  back,
  children,
}: {
  actions?: ReactNode;
  back?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 flex h-14 items-center justify-between bg-base-100/90 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        {back ? (
          <Link
            aria-label="Назад"
            className="btn btn-circle border-0 bg-base-200"
            to={back}
          >
            <Icon name="chevron-left" />
          </Link>
        ) : null}
        {children}
      </div>
      {actions ? (
        <div className={cn('flex items-center rounded-full bg-base-200')}>
          {actions}
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}
