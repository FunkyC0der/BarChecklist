import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

const tones = {
  default: '',
  error: 'text-error',
  muted: 'text-base-content/60',
  success: 'text-success',
} as const;

const variants = {
  body: 'text-base',
  caption: 'text-sm',
  heading: 'text-xl font-semibold',
  label: 'font-semibold',
  title: 'text-3xl font-bold',
} as const;

export type AppTextProps = {
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  children: ReactNode;
  tone?: keyof typeof tones;
  variant?: keyof typeof variants;
} & HTMLAttributes<HTMLElement>;

export function AppText({
  as: Tag = 'p',
  children,
  className,
  tone = 'default',
  variant = 'body',
  ...props
}: AppTextProps) {
  return (
    <Tag className={cn(variants[variant], tones[tone], className)} {...props}>
      {children}
    </Tag>
  );
}
