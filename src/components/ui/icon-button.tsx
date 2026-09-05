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
        'btn btn-circle btn-ghost',
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
