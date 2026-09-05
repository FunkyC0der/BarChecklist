import type { ReactNode } from 'react';

import { AppText, Card } from '@/components/ui';

type AuthShellProps = {
  children: ReactNode;
  description: string;
  footer: ReactNode;
  title: string;
};

export function AuthShell({
  children,
  description,
  footer,
  title,
}: AuthShellProps) {
  return (
    <div className="hero min-h-dvh bg-base-200 pt-[env(safe-area-inset-top)]">
      <div className="hero-content w-full max-w-sm flex-col px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="text-center">
          <AppText as="h1" variant="title">
            Bar Checklist
          </AppText>
          <AppText tone="muted">
            Щоденні чеклісти команди без зайвого шуму.
          </AppText>
        </div>
        <Card className="w-full" description={description} title={title}>
          {children}
        </Card>
        <div className="text-center">{footer}</div>
      </div>
    </div>
  );
}
