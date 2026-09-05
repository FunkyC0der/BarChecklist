import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type CardProps = {
  bodyClassName?: string | undefined;
  children: ReactNode;
  description?: string | undefined;
  title?: string | undefined;
} & HTMLAttributes<HTMLDivElement>;

export function Card({
  bodyClassName,
  children,
  className,
  description,
  title,
  ...props
}: CardProps) {
  return (
    <div className={cn('card bg-base-100 card-border', className)} {...props}>
      <div className={cn('card-body', bodyClassName)}>
        {title ? <h2 className="card-title">{title}</h2> : null}
        {description ? (
          <p className="text-base-content/60">{description}</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
