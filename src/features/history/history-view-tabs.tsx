import type { ComponentType } from 'react';
import { Link, type LinkProps } from '@/lib/router';
import { cn } from '@/lib/cn';
import { useLocation } from '@/lib/router-hooks';

// `/history` is a pathname prefix of `/history/stats`, so TanStack's default
// fuzzy active-matching (and the `aria-current` it injects) would mark the
// Записи tab active even while on Статистика. `exact: true` disables that.
const ExactLink = Link as unknown as ComponentType<
  LinkProps & { activeOptions?: { exact?: boolean } }
>;

const views = [
  { label: 'Записи', path: '/history' },
  { label: 'Статистика', path: '/history/stats' },
] as const;

export function HistoryViewTabs() {
  const location = useLocation();
  const search = location.searchStr;

  return (
    <nav aria-label="Вигляд історії" className="px-4">
      <div className="tabs tabs-box w-fit" role="tablist">
        {views.map((view) => {
          const active = location.pathname === view.path;
          return (
            <ExactLink
              activeOptions={{ exact: true }}
              aria-current={active ? 'page' : undefined}
              className={cn('tab', active && 'tab-active')}
              key={view.path}
              role="tab"
              to={`${view.path}${search}`}
            >
              {view.label}
            </ExactLink>
          );
        })}
      </div>
    </nav>
  );
}
