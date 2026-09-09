import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/lib/router';
import { useSearchParams } from '@/lib/router-hooks';

import {
  Alert,
  Badge,
  Button,
  EmptyState,
  IconButton,
  Input,
  ListRow,
  Page,
  Sheet,
  Skeleton,
} from '@/components/ui';
import { HistoryViewTabs } from '@/features/history/history-view-tabs';
import { historyOptionsQueryOptions } from '@/features/history/history-queries';
import type { StatsFilters } from '@/features/stats/stats-api';
import { memberStatsQueryOptions } from '@/features/stats/stats-queries';
import { initials } from '@/features/teams/team-display';
import { useTeams } from '@/features/teams/team-context';
import { logicalDate } from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import { isPermissionError } from '@/lib/log-error';

function filtersFromParams(params: URLSearchParams): StatsFilters {
  return {
    checklistId: params.get('checklist'),
    fromDate: params.get('from'),
    toDate: params.get('to'),
  };
}
function paramsFromFilters(filters: StatsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.fromDate) params.set('from', filters.fromDate);
  if (filters.toDate) params.set('to', filters.toDate);
  if (filters.checklistId) params.set('checklist', filters.checklistId);
  return params;
}
function presetRange(days: number, logicalToday: string): StatsFilters {
  const date = new Date(`${logicalToday}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (days - 1));
  return {
    checklistId: null,
    fromDate: date.toISOString().slice(0, 10),
    toDate: logicalToday,
  };
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

export function HistoryStatsRoute() {
  const { activeTeam, error: teamsError, refreshTeams, status } = useTeams();
  const teamId = activeTeam?.id ?? null;
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = filtersFromParams(searchParams);
  const [draft, setDraft] = useState<StatsFilters>(filters);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  const statsQuery = useQuery({
    ...memberStatsQueryOptions(teamId ?? 'none', filters),
    enabled: Boolean(teamId),
  });
  const optionsQuery = useQuery({
    ...historyOptionsQueryOptions(teamId ?? 'none'),
    enabled: Boolean(teamId),
  });
  const stats = statsQuery.data ?? null;
  const options = optionsQuery.data ?? null;
  const loading = statsQuery.isLoading;
  const error =
    statsQuery.error && !isPermissionError(statsQuery.error)
      ? getErrorMessage(statsQuery.error, 'Не вдалося завантажити статистику.')
      : null;
  const permissionDenied = isPermissionError(statsQuery.error);
  const optionsError = optionsQuery.error
    ? getErrorMessage(optionsQuery.error, 'Не вдалося завантажити фільтри.')
    : null;
  const retry = () => void statsQuery.refetch();

  const applyFilters = (next: StatsFilters) => {
    setSearchParams(paramsFromFilters(next));
    setFilterOpen(false);
  };
  const openCustomRange = () => {
    setDraft(filters);
    setFilterOpen(true);
  };
  const activePreset = (() => {
    if (!filters.fromDate && !filters.toDate)
      return filters.checklistId ? null : '30';
    if (!stats) return null;
    if (
      filters.fromDate === presetRange(7, stats.logicalToday).fromDate &&
      filters.toDate === stats.logicalToday
    )
      return filters.checklistId ? null : '7';
    if (
      filters.fromDate === presetRange(30, stats.logicalToday).fromDate &&
      filters.toDate === stats.logicalToday
    )
      return filters.checklistId ? null : '30';
    if (
      activeTeam &&
      filters.fromDate ===
        logicalDate(new Date(activeTeam.created_at), activeTeam.timezone) &&
      filters.toDate === stats.logicalToday
    )
      return filters.checklistId ? null : 'all';
    return null;
  })();
  const activeFilterCount = [filters.checklistId, !activePreset].filter(
    Boolean,
  ).length;

  if (status === 'idle' || status === 'loading')
    return (
      <Page title="Статистика">
        <HistoryViewTabs />
        <Skeleton rows={5} />
      </Page>
    );
  if (status === 'error')
    return (
      <Page title="Статистика">
        <HistoryViewTabs />
        <Alert color="error">
          <span className="flex-1">
            {teamsError ?? 'Не вдалося завантажити команди.'}
          </span>
          <Button onClick={() => void refreshTeams()} size="sm">
            Повторити
          </Button>
        </Alert>
      </Page>
    );
  if (!activeTeam)
    return (
      <Page title="Статистика">
        <HistoryViewTabs />
        <EmptyState
          action={
            <Link className="btn btn-primary" to="/team">
              Створити команду
            </Link>
          }
          description="Статистика з’явиться після створення команди та виконання задач."
          icon="clock"
          title="Команди ще немає"
        />
      </Page>
    );
  if (loading && !stats)
    return (
      <Page title="Статистика">
        <HistoryViewTabs />
        <Skeleton rows={5} />
      </Page>
    );
  if (permissionDenied)
    return (
      <Page title="Статистика">
        <HistoryViewTabs />
        <Alert color="error">
          <span className="flex-1">
            У вас немає доступу до статистики цієї команди.
          </span>
          <Button onClick={retry} size="sm">
            Повторити
          </Button>
        </Alert>
      </Page>
    );

  const hasFilters = activeFilterCount > 0;
  const noResults = !stats || stats.members.length === 0;
  const resetFilters = () =>
    applyFilters({ checklistId: null, fromDate: null, toDate: null });

  return (
    <Page
      actions={
        <IconButton
          icon="calendar"
          label="Фільтри статистики"
          onClick={openCustomRange}
          ref={filterTriggerRef}
        />
      }
      title="Статистика"
      titleBadge={
        activeFilterCount > 0 ? (
          <Badge size="sm" soft>
            {activeFilterCount}
          </Badge>
        ) : undefined
      }
    >
      <HistoryViewTabs />
      {error ? (
        <Alert color="error">
          <span className="flex-1">{error}</span>
          <Button onClick={retry} size="sm">
            Повторити
          </Button>
        </Alert>
      ) : null}
      {optionsError ? <Alert color="warning">{optionsError}</Alert> : null}
      {stats ? (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              applyFilters({
                ...presetRange(7, stats.logicalToday),
                checklistId: filters.checklistId,
              })
            }
            size="sm"
            variant={activePreset === '7' ? 'solid' : 'soft'}
            {...(activePreset === '7' ? { color: 'primary' } : {})}
          >
            7 днів
          </Button>
          <Button
            onClick={() =>
              applyFilters({
                ...presetRange(30, stats.logicalToday),
                checklistId: filters.checklistId,
              })
            }
            size="sm"
            variant={activePreset === '30' ? 'solid' : 'soft'}
            {...(activePreset === '30' ? { color: 'primary' } : {})}
          >
            30 днів
          </Button>
          <Button
            onClick={() =>
              applyFilters({
                checklistId: filters.checklistId,
                fromDate: logicalDate(
                  new Date(activeTeam.created_at),
                  activeTeam.timezone,
                ),
                toDate: stats.logicalToday,
              })
            }
            size="sm"
            variant={activePreset === 'all' ? 'solid' : 'soft'}
            {...(activePreset === 'all' ? { color: 'primary' } : {})}
          >
            Весь час
          </Button>
          <Button onClick={openCustomRange} size="sm" variant="soft">
            Свій період
          </Button>
        </div>
      ) : null}
      {noResults ? (
        <EmptyState
          description={
            hasFilters
              ? 'За цими фільтрами нічого не знайдено.'
              : 'Ще немає виконаних завдань.'
          }
          icon="users"
          title={
            hasFilters ? 'Нічого не знайдено' : 'Ще немає виконаних завдань'
          }
        />
      ) : (
        <div>
          <h2 className="mb-1 text-xs font-medium tracking-wide text-base-content/60 uppercase">
            Учасники
          </h2>
          <ul className="list">
            {stats!.members.map((member) => {
              const share =
                stats!.teamCompletedCount > 0
                  ? Math.round(
                      (member.completedCount / stats!.teamCompletedCount) * 100,
                    )
                  : 0;
              return (
                <ListRow
                  key={member.userId}
                  leading={
                    <div className="avatar avatar-placeholder">
                      <div className="w-10 rounded-full bg-neutral text-neutral-content">
                        <span className="text-sm">
                          {initials(member.displayName)}
                        </span>
                      </div>
                    </div>
                  }
                  meta={
                    member.completedCount > 0 ? (
                      <div className="flex w-full flex-col gap-1">
                        <span>
                          {member.completedCount} виконано · {share}%
                          {member.lastCompletionDate
                            ? ` · остання активність ${dateLabel(member.lastCompletionDate)}`
                            : ''}
                        </span>
                        <progress
                          className="progress h-1 progress-primary"
                          max={100}
                          value={share}
                        />
                      </div>
                    ) : (
                      'Немає виконаних завдань'
                    )
                  }
                  title={
                    <span className="flex items-center gap-2">
                      {member.displayName}
                      {!member.currentMember ? (
                        <Badge size="sm" soft>
                          Колишній учасник
                        </Badge>
                      ) : null}
                    </span>
                  }
                  to={`/history/stats/${member.userId}?${searchParams.toString()}`}
                  trailing={<Badge soft>{member.completedCount}</Badge>}
                />
              );
            })}
          </ul>
        </div>
      )}
      <Sheet
        onClose={() => setFilterOpen(false)}
        open={filterOpen}
        title="Свій період"
        triggerRef={filterTriggerRef}
      >
        <div className="flex flex-col gap-4">
          <Input
            aria-label="Від дати"
            className="input-sm"
            label="Від дати"
            max={stats?.logicalToday}
            onChangeText={(fromDate) =>
              setDraft((current) => ({ ...current, fromDate }))
            }
            type="date"
            value={draft.fromDate ?? ''}
          />
          <Input
            aria-label="До дати"
            className="input-sm"
            label="До дати"
            max={stats?.logicalToday}
            min={draft.fromDate ?? undefined}
            onChangeText={(toDate) =>
              setDraft((current) => ({ ...current, toDate }))
            }
            type="date"
            value={draft.toDate ?? ''}
          />
          <label className="fieldset">
            <span className="fieldset-legend">Чекліст</span>
            <select
              aria-label="Чекліст"
              className="select w-full select-sm"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  checklistId: event.target.value || null,
                }))
              }
              value={draft.checklistId ?? ''}
            >
              <option value="">Усі чеклісти</option>
              {options?.checklists.map((checklist) => (
                <option key={checklist.id} value={checklist.id}>
                  {checklist.name}
                  {checklist.archived ? ' (архівний)' : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              className="btn-block"
              onClick={resetFilters}
              variant="ghost"
            >
              Скинути
            </Button>
            <Button
              className="btn-block"
              color="primary"
              onClick={() => applyFilters(draft)}
            >
              Застосувати
            </Button>
          </div>
        </div>
      </Sheet>
    </Page>
  );
}
