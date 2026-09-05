import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Screen({
  children,
  className,
  inset = false,
  scroll = true,
}: {
  children: ReactNode;
  className?: string | undefined;
  inset?: boolean | undefined;
  scroll?: boolean;
}) {
  if (inset) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>{children}</div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-dvh bg-base-200 pt-[env(safe-area-inset-top)]',
        scroll ? 'overflow-auto' : 'overflow-hidden',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}
