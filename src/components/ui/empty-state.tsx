import type { ReactNode } from 'react';

import { AppText } from './app-text';
import { Card } from './card';

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card className="items-center py-8">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-2 text-center">
        <AppText variant="heading">{title}</AppText>
        <AppText tone="muted">{description}</AppText>
      </div>
      {action}
    </Card>
  );
}
