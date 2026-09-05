import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type CardProps = {
  children: ReactNode;
  description?: string | undefined;
  title?: string | undefined;
} & HTMLAttributes<HTMLDivElement>;

export function Card({
  children,
  className,
  description,
  title,
  ...props
}: CardProps) {
  return (
    <div className={cn('card bg-base-100 shadow-sm', className)} {...props}>
      <div className="card-body gap-4">
        {title ? <h2 className="card-title">{title}</h2> : null}
        {description ? (
          <p className="text-base-content/60">{description}</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
