import type { ReactNode } from 'react';

import { AppText, Card, Screen } from '@/components/ui';

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
    <Screen>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-8">
        <div className="flex flex-col gap-2">
          <AppText as="h1" variant="title">
            Bar Checklist
          </AppText>
          <AppText tone="muted">
            Щоденні чеклісти команди без зайвого шуму.
          </AppText>
        </div>
        <Card description={description} title={title}>
          {children}
        </Card>
        <div className="text-center">{footer}</div>
      </div>
    </Screen>
  );
}
