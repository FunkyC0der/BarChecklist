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
  soft = false,
  size,
  ...props
}: {
  children: ReactNode;
  color?: keyof typeof colors;
  soft?: boolean | undefined;
  size?: 'sm' | undefined;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'badge',
        soft && 'badge-soft',
        !(soft && color === 'neutral') && colors[color],
        size === 'sm' && 'badge-sm',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
