import type { ReactNode } from 'react';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export function EmptyState({
  action,
  bordered = true,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  /** @deprecated Card wrapper is no longer used; prop kept for compatibility */
  bordered?: boolean | undefined;
  description: string;
  icon?: IconName | undefined;
  title: string;
}) {
  void bordered;
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      {icon ? (
        <span className="grid size-14 place-items-center rounded-full bg-base-200">
          <Icon className="size-7" name={icon} />
        </span>
      ) : null}
      <AppText as="h2" variant="heading">
        {title}
      </AppText>
      <AppText variant="caption">{description}</AppText>
      {action}
    </div>
  );
}
