import type { ReactNode } from 'react';

import { Toolbar } from './toolbar';

export function Page({
  actions,
  back,
  children,
  hideTitle = false,
  title,
  titleBadge,
}: {
  actions?: ReactNode;
  back?: string | undefined;
  children: ReactNode;
  hideTitle?: boolean | undefined;
  title: string;
  titleBadge?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-contain">
      {back ? <Toolbar actions={actions} back={back} /> : null}
      <div className="flex items-center justify-between gap-3 px-4 pt-2 pb-3">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h1
            className={
              hideTitle
                ? 'sr-only text-3xl font-bold tracking-tight'
                : 'text-3xl font-bold tracking-tight'
            }
          >
            {title}
          </h1>
          {titleBadge}
        </div>
        {!back && actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="flex flex-col gap-6 px-4 pb-32">{children}</div>
    </div>
  );
}
