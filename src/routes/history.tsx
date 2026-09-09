import { useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link } from '@/lib/router';

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
  TaskMarker,
} from '@/components/ui';
import type {
  HistoryFilters,
  HistoryResponse,
} from '@/features/history/history-api';
import {
  emptyFilters,
  historyOptionsQueryOptions,
  historyQueryOptions,
} from '@/features/history/history-queries';
import { useTeams } from '@/features/teams/team-context';
import { getErrorMessage } from '@/lib/errors';

function isPermissionError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '42501'
  );
}
function subtractDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}
function timeLabel(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value));
}

export function HistoryRoute() {
  const { activeTeam, error: teamsError, refreshTeams, status } = useTeams();
  const teamId = activeTeam?.id ?? null;
  const [filters, setFilters] = useState<HistoryFilters>(emptyFilters);
  const [draft, setDraft] = useState<HistoryFilters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const loadingMoreRef = useRef(false);
  const lastTeamIdRef = useRef(teamId);

  if (lastTeamIdRef.current !== teamId) {
    lastTeamIdRef.current = teamId;
    if (filters !== emptyFilters) setFilters(emptyFilters);
    if (draft !== emptyFilters) setDraft(emptyFilters);
  }
  const historyQuery = useInfiniteQuery({
    ...historyQueryOptions(teamId ?? 'none', filters),
    enabled: Boolean(teamId),
  });
  const optionsQuery = useQuery({
    ...historyOptionsQueryOptions(teamId ?? 'none'),
    enabled: Boolean(teamId),
  });
  const history = useMemo<HistoryResponse | null>(() => {
    const pages = historyQuery.data?.pages.filter(Boolean);
    if (!pages?.length) return null;
    const first = pages[0]!;
    const dates = new Set<string>();
    return {
      ...first,
      hasMore: Boolean(historyQuery.hasNextPage),
      nextBeforeDate: pages.at(-1)?.nextBeforeDate ?? null,
      days: pages
        .flatMap((page) => page.days)
        .filter((day) => !dates.has(day.date) && Boolean(dates.add(day.date))),
    };
  }, [historyQuery.data, historyQuery.hasNextPage]);
  const options = optionsQuery.data ?? null;
  const loading = historyQuery.isLoading;
  const loadingMore = historyQuery.isFetchingNextPage;
  const error =
    historyQuery.error && !isPermissionError(historyQuery.error)
      ? getErrorMessage(historyQuery.error, 'Не вдалося завантажити історію.')
      : null;
  const permissionDenied = isPermissionError(historyQuery.error);
  const optionsError = optionsQuery.error
    ? getErrorMessage(optionsQuery.error, 'Не вдалося завантажити фільтри.')
    : null;

  const defaults = useMemo(
    () =>
      history
        ? {
            ...emptyFilters,
            fromDate: subtractDays(history.logicalToday, 13),
            toDate: history.logicalToday,
          }
        : emptyFilters,
    [history],
  );
  const isDefaultRange =
    filters.fromDate === defaults.fromDate &&
    filters.toDate === defaults.toDate;
  const activeFilterCount = [
    !isDefaultRange && (filters.fromDate || filters.toDate),
    filters.checklistId,
    filters.userId,
  ].filter(Boolean).length;
  const applyFilters = () => {
    const next = { ...draft, beforeDate: null };
    setFilters(next);
    setFilterOpen(false);
  };
  const resetFilters = () => {
    setFilters(defaults);
    setDraft(defaults);
    setFilterOpen(false);
  };
  const openFilters = () => {
    setDraft(filters.fromDate || filters.toDate ? filters : defaults);
    setFilterOpen(true);
  };
  const retry = () => void historyQuery.refetch();

  if (status === 'idle' || status === 'loading')
    return (
      <Page title="Історія">
        <Skeleton rows={5} />
      </Page>
    );
  if (status === 'error')
    return (
      <Page title="Історія">
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
      <Page title="Історія">
        <EmptyState
          action={
            <Link className="btn btn-primary" to="/team">
              Створити команду
            </Link>
          }
          description="Історія з’явиться після створення команди та виконання задач."
          icon="clock"
          title="Команди ще немає"
        />
      </Page>
    );
  if (loading && !history)
    return (
      <Page title="Історія">
        <Skeleton rows={5} />
      </Page>
    );
  if (permissionDenied)
    return (
      <Page title="Історія">
        <Alert color="error">
          <span className="flex-1">
            У вас немає доступу до історії цієї команди.
          </span>
          <Button onClick={retry} size="sm">
            Повторити
          </Button>
        </Alert>
      </Page>
    );
  const noResults = !history || history.days.length === 0;
  const hasFilters = activeFilterCount > 0;

  return (
    <Page
      actions={
        <IconButton
          icon="calendar"
          label="Фільтри історії"
          onClick={openFilters}
          ref={filterTriggerRef}
        />
      }
      title="Історія"
      titleBadge={
        activeFilterCount > 0 ? (
          <Badge size="sm" soft>
            {activeFilterCount}
          </Badge>
        ) : undefined
      }
    >
      {error ? (
        <Alert color="error">
          <span className="flex-1">{error}</span>
          <Button onClick={retry} size="sm">
            Повторити
          </Button>
        </Alert>
      ) : null}
      {optionsError ? <Alert color="warning">{optionsError}</Alert> : null}
      {noResults ? (
        <EmptyState
          action={
            hasFilters ? (
              <Button onClick={resetFilters}>Скинути фільтри</Button>
            ) : undefined
          }
          description={
            hasFilters
              ? 'За цими фільтрами нічого не знайдено.'
              : 'У команди ще немає задач за останні 14 днів.'
          }
          icon="clock"
          title={hasFilters ? 'Нічого не знайдено' : 'Історія порожня'}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {history.days.map((day) => (
            <section aria-labelledby={`history-day-${day.date}`} key={day.date}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <h2
                  className="text-xs font-medium tracking-wide text-base-content/60 uppercase"
                  id={`history-day-${day.date}`}
                >
                  {dateLabel(day.date)}
                </h2>
                <span className="text-xs text-base-content/60">
                  {day.completedCount} / {day.completedCount + day.missedCount}
                </span>
              </div>
              {day.completions.length > 0 ? (
                <ul className="list">
                  {day.completions.map((completion) => (
                    <ListRow
                      key={completion.id}
                      meta={`${completion.checklistName} · ${completion.completedByName} · ${timeLabel(completion.completedAt, activeTeam.timezone)}`}
                      title={completion.taskTitle}
                    />
                  ))}
                </ul>
              ) : null}
              {day.missed.length > 0 ? (
                <>
                  <h3
                    className="mt-2 mb-1 text-xs font-medium tracking-wide text-base-content/60 uppercase"
                    id={`history-day-${day.date}-missed`}
                  >
                    Не виконано
                  </h3>
                  <ul
                    aria-labelledby={`history-day-${day.date}-missed`}
                    className="list"
                  >
                    {day.missed.map((task) => (
                      <ListRow
                        key={task.taskId}
                        leading={<TaskMarker />}
                        meta={task.checklistName}
                        title={
                          <span className="text-base-content/60">
                            {task.taskTitle}
                          </span>
                        }
                      />
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          ))}
          {history.hasMore ? (
            <Button
              disabled={historyQuery.isFetchingNextPage}
              loading={loadingMore}
              onClick={() => {
                if (loadingMoreRef.current) return;
                loadingMoreRef.current = true;
                void historyQuery.fetchNextPage().finally(() => {
                  loadingMoreRef.current = false;
                });
              }}
            >
              Завантажити ще
            </Button>
          ) : null}
        </div>
      )}
      <Sheet
        onClose={() => setFilterOpen(false)}
        open={filterOpen}
        title="Фільтри історії"
        triggerRef={filterTriggerRef}
      >
        <div className="flex flex-col gap-4">
          <Input
            aria-label="Від дати"
            className="input-sm"
            label="Від дати"
            max={history?.logicalToday}
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
            max={history?.logicalToday}
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
          <label className="fieldset">
            <span className="fieldset-legend">Учасник</span>
            <select
              aria-label="Учасник"
              className="select w-full select-sm"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  userId: event.target.value || null,
                }))
              }
              value={draft.userId ?? ''}
            >
              <option value="">Усі учасники</option>
              {options?.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                  {!user.currentMember ? ' (колишній учасник)' : ''}
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
              onClick={applyFilters}
            >
              Застосувати
            </Button>
          </div>
        </div>
      </Sheet>
    </Page>
  );
}
