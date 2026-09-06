import type { ReactNode } from 'react';

import { AppText } from '@/components/ui';

type AuthShellProps = {
  brand?: boolean;
  children?: ReactNode;
  description: string;
  footer: ReactNode;
  title: string;
};

export function AuthShell({
  brand = true,
  children,
  description,
  footer,
  title,
}: AuthShellProps) {
  return (
    <main className="flex min-h-dvh flex-col overflow-x-hidden bg-base-100 px-4 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:items-center sm:justify-center sm:bg-base-200">
      <div className="flex w-full max-w-full flex-1 flex-col sm:card sm:max-w-sm sm:flex-none sm:overflow-hidden sm:bg-base-100 sm:card-border">
        <div className="flex flex-1 flex-col sm:card-body">
          {brand ? (
            <div className="mb-8 text-center">
              <AppText as="h1" variant="display">
                Bar Checklist
              </AppText>
              <AppText className="text-sm" variant="body">
                Щоденні чеклісти команди без зайвого шуму.
              </AppText>
            </div>
          ) : null}
          <AppText as="h2" variant="heading">
            {title}
          </AppText>
          <AppText className="mt-1 text-sm" variant="body">
            {description}
          </AppText>
          <div className="mt-6 flex flex-col gap-4">{children ?? null}</div>
          <div className="mt-auto pt-8 text-center text-sm">{footer}</div>
        </div>
      </div>
    </main>
  );
}
