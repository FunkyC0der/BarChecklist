import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

const colorClass = {
  default: '',
  error: 'btn-error',
  primary: 'btn-primary',
  secondary: 'btn-secondary',
} as const;

const sizeClass = {
  lg: 'btn-lg',
  md: '',
  sm: 'btn-sm',
} as const;

const variantClass = {
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  soft: 'btn-soft',
  solid: '',
} as const;

const shapeClass = {
  circle: 'btn-circle',
  square: '',
} as const;

export type ButtonProps = {
  children: ReactNode;
  color?: keyof typeof colorClass;
  loading?: boolean | undefined;
  shape?: keyof typeof shapeClass;
  size?: keyof typeof sizeClass;
  variant?: keyof typeof variantClass;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'>;

export function Button({
  children,
  className,
  color = 'default',
  disabled,
  loading = false,
  shape = 'square',
  size = 'md',
  type = 'button',
  variant = 'solid',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'btn transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100',
        colorClass[color],
        sizeClass[size],
        variantClass[variant],
        shapeClass[shape],
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
