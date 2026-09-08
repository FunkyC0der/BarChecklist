import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';

export type IconButtonProps = {
  icon: IconName;
  label: string;
  size?: 'sm' | 'md';
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ className, icon, label, size = 'md', ...props }, ref) {
    return (
      <button
        aria-label={label}
        className={cn(
          'btn btn-circle btn-ghost transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100',
          size === 'sm' && 'btn-sm',
          className,
        )}
        type="button"
        ref={ref}
        {...props}
      >
        <Icon name={icon} />
      </button>
    );
  },
);
