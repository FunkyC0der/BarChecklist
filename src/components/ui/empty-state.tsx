import type { ReactNode } from 'react';

import { AppText } from './app-text';
import { Card } from './card';

export function EmptyState({
  action,
  bordered = true,
  description,
  title,
}: {
  action?: ReactNode;
  bordered?: boolean | undefined;
  description: string;
  title: string;
}) {
  const body = (
    <>
      <AppText as="h2" variant="heading">
        {title}
      </AppText>
      <AppText tone="muted">{description}</AppText>
      {action ? (
        <div className="card-actions justify-center">{action}</div>
      ) : null}
    </>
  );

  if (!bordered) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        {body}
      </div>
    );
  }

  return <Card bodyClassName="items-center text-center">{body}</Card>;
}
