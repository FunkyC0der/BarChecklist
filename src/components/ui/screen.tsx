import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Screen({
  children,
  className,
  scroll = true,
}: {
  children: ReactNode;
  className?: string | undefined;
  scroll?: boolean;
}) {
  return (
    <div
      className={cn(
        'min-h-full bg-base-200',
        scroll ? 'overflow-auto' : 'overflow-hidden',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8 md:px-8">
        {children}
      </div>
    </div>
  );
}
