import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import {
  fetchHistory,
  fetchHistoryFilterOptions,
  type HistoryFilterOptions,
  type HistoryFilters,
  type HistoryResponse,
} from '@/features/history/history-api';
import { useTeams } from '@/features/teams/team-context';
import { getErrorMessage } from '@/lib/errors';

const emptyFilters: HistoryFilters = {
  beforeDate: null,
  checklistId: null,
  fromDate: null,
  toDate: null,
  userId: null,
};

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
  const { activeTeam, status } = useTeams();
  const teamId = activeTeam?.id ?? null;
  const [filters, setFilters] = useState<HistoryFilters>(emptyFilters);
  const [draft, setDraft] = useState<HistoryFilters>(emptyFilters);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [options, setOptions] = useState<HistoryFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const requestId = useRef(0);
  const optionsRequestId = useRef(0);
  const loadingMoreRef = useRef(false);

  const load = useCallback(
    async (nextFilters: HistoryFilters, append = false) => {
      if (!teamId) return;
      if (append) {
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        loadingMoreRef.current = false;
        setLoadingMore(false);
        setLoading(true);
      }
      const currentRequest = ++requestId.current;
      setError(null);
      setPermissionDenied(false);
      try {
        const result = await fetchHistory(teamId, nextFilters);
        if (currentRequest !== requestId.current) return;
        setHistory((current) => {
          if (!append || !current) return result;
          const existingDates = new Set(current.days.map((day) => day.date));
          return {
            ...result,
            days: [
              ...current.days,
              ...result.days.filter((day) => !existingDates.has(day.date)),
            ],
          };
        });
      } catch (loadError) {
        if (currentRequest !== requestId.current) return;
        if (isPermissionError(loadError)) setPermissionDenied(true);
        else
          setError(
            getErrorMessage(loadError, 'Не вдалося завантажити історію.'),
          );
      } finally {
        if (currentRequest === requestId.current) {
          if (append) {
            loadingMoreRef.current = false;
            setLoadingMore(false);
          } else setLoading(false);
        }
      }
    },
    [teamId],
  );

  useEffect(() => {
    if (!teamId) return;
    const timer = setTimeout(() => {
      requestId.current += 1;
      const currentOptionsRequest = ++optionsRequestId.current;
      setHistory(null);
      setFilters(emptyFilters);
      setDraft(emptyFilters);
      setError(null);
      setPermissionDenied(false);
      setOptionsError(null);
      setOptions(null);
      void load(emptyFilters);
      void fetchHistoryFilterOptions(teamId)
        .then((nextOptions) => {
          if (currentOptionsRequest === optionsRequestId.current) {
            setOptions(nextOptions);
          }
        })
        .catch((optionError: unknown) => {
          if (currentOptionsRequest === optionsRequestId.current) {
            setOptionsError(
              getErrorMessage(optionError, 'Не вдалося завантажити фільтри.'),
            );
          }
        });
    }, 0);
    return () => clearTimeout(timer);
  }, [load, teamId]);

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
    void load(next);
  };
  const resetFilters = () => {
    setFilters(defaults);
    setDraft(defaults);
    setFilterOpen(false);
    void load(defaults);
  };
  const openFilters = () => {
    setDraft(filters.fromDate || filters.toDate ? filters : defaults);
    setFilterOpen(true);
  };
  const retry = () => void load(filters);

  if (status === 'loading' || !activeTeam || (loading && !history))
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
              ? 'За цими фільтрами виконань не знайдено.'
              : 'У команди ще немає виконань за останні 14 днів.'
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
                  {day.completedCount}
                </span>
              </div>
              <ul className="list">
                {day.completions.map((completion) => (
                  <ListRow
                    key={completion.id}
                    meta={`${completion.checklistName} · ${completion.completedByName} · ${timeLabel(completion.completedAt, activeTeam.timezone)}`}
                    title={completion.taskTitle}
                  />
                ))}
              </ul>
            </section>
          ))}
          {history.hasMore ? (
            <Button
              loading={loadingMore}
              onClick={() =>
                void load(
                  { ...filters, beforeDate: history.nextBeforeDate },
                  true,
                )
              }
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
      >
        <div className="flex flex-col gap-4 pt-4">
          <Input
            aria-label="Від дати"
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
              className="select w-full"
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
              className="select w-full"
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
