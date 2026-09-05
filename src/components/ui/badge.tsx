import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

const colors = {
  accent: 'badge-accent',
  error: 'badge-error',
  info: 'badge-info',
  neutral: 'badge-neutral',
  primary: 'badge-primary',
  secondary: 'badge-secondary',
  success: 'badge-success',
  warning: 'badge-warning',
} as const;

export function Badge({
  children,
  className,
  color = 'neutral',
  ...props
}: {
  children: ReactNode;
  color?: keyof typeof colors;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('badge', colors[color], className)} {...props}>
      {children}
    </span>
  );
}
