import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

const colors = {
  error: 'alert-error',
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
} as const;

export function Alert({
  children,
  className,
  color = 'info',
  soft = true,
  ...props
}: {
  children: ReactNode;
  color?: keyof typeof colors;
  soft?: boolean | undefined;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('alert', soft && 'alert-soft', colors[color], className)}
      role="alert"
      {...props}
    >
      {children}
    </div>
  );
}
