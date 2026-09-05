import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

const colorClass = {
  default: '',
  error: 'btn-error',
  primary: 'btn-primary',
  secondary: 'btn-secondary',
} as const;

const sizeClass = {
  md: '',
  sm: 'btn-sm',
} as const;

const variantClass = {
  ghost: 'btn-ghost',
  solid: '',
} as const;

export type ButtonProps = {
  children: ReactNode;
  color?: keyof typeof colorClass;
  loading?: boolean | undefined;
  size?: keyof typeof sizeClass;
  variant?: keyof typeof variantClass;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'>;

export function Button({
  children,
  className,
  color = 'default',
  disabled,
  loading = false,
  size = 'md',
  type = 'button',
  variant = 'solid',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'btn',
        colorClass[color],
        sizeClass[size],
        variantClass[variant],
        className,
      )}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? <span className="loading loading-spinner" /> : null}
      {children}
    </button>
  );
}
