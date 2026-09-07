import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';

export function IconButton({
  className,
  icon,
  label,
  size = 'md',
  ...props
}: {
  icon: IconName;
  label: string;
  size?: 'sm' | 'md';
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button
      aria-label={label}
      className={cn(
        'btn btn-circle btn-ghost transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100',
        size === 'sm' && 'btn-sm',
        className,
      )}
      type="button"
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
