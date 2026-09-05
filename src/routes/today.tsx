import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Page,
  Skeleton,
} from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/features/auth/auth-context';
import {
  completeTask,
  fetchTodaySnapshot,
  type TodaySnapshot,
  uncompleteTask,
} from '@/features/completions/today-api';
import { useLogicalDateRefresh } from '@/features/completions/use-logical-date-refresh';
import { useTodayRealtime } from '@/features/completions/use-today-realtime';
import { useTeams } from '@/features/teams/team-context';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errors';

type TodayTask = TodaySnapshot['checklists'][number]['tasks'][number];
type TodayCompletion = NonNullable<TodayTask['completion']>;
type MutationFailure = {
  action: 'complete' | 'uncomplete';
  taskId: string;
};

function withTaskCompletion(
  snapshot: TodaySnapshot,
  taskId: string,
  completion: TodayCompletion | null,
) {
  return {
    ...snapshot,
    checklists: snapshot.checklists.map((checklist) => ({
      ...checklist,
      tasks: checklist.tasks.map((task) =>
        task.id === taskId ? { ...task, completion } : task,
      ),
    })),
  };
}

function completionTime(completedAt: string, timeZone: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone,
  }).format(new Date(completedAt));
}

function findTask(snapshot: TodaySnapshot | null, taskId: string) {
  return snapshot?.checklists
    .flatMap((checklist) => checklist.tasks)
    .find((task) => task.id === taskId);
}

export function TodayRoute() {
  const showToast = useToast();
  const { session } = useAuth();
  const { activeTeam, status } = useTeams();
  const teamId = activeTeam?.id ?? null;
  const [snapshot, setSnapshot] = useState<TodaySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationFailure, setMutationFailure] =
    useState<MutationFailure | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const requestId = useRef(0);

  const loadToday = useCallback(
    async (showLoading = false) => {
      if (!teamId) return;

      const currentRequest = ++requestId.current;
      if (showLoading) setLoading(true);
      setError(null);
      try {
        const nextSnapshot = await fetchTodaySnapshot(teamId);
        if (currentRequest === requestId.current) setSnapshot(nextSnapshot);
      } catch (loadError) {
        if (currentRequest === requestId.current) {
          setError(
            getErrorMessage(loadError, 'Не вдалося завантажити задачі.'),
          );
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    },
    [teamId],
  );

  const refreshToday = useCallback(() => {
    void loadToday(false);
  }, [loadToday]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSnapshot(null);
      setError(null);
      setMutationFailure(null);
      setPendingTaskIds(new Set());
      void loadToday(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [loadToday]);

  const checklistIds = useMemo(
    () => snapshot?.checklists.map((checklist) => checklist.id) ?? [],
    [snapshot],
  );
  const { realtimeStatus, retryRealtime } = useTodayRealtime({
    checklistIds,
    onRefresh: refreshToday,
    teamId,
  });

  useLogicalDateRefresh({
    logicalDate: snapshot?.logicalDate ?? null,
    onRefresh: refreshToday,
    timeZone: snapshot?.timezone ?? activeTeam?.timezone ?? null,
  });

  const toggleTask = useCallback(
    async (task: TodayTask, shouldComplete: boolean) => {
      if (!snapshot || !session || pendingTaskIds.has(task.id)) return;

      const previousCompletion = task.completion;
      const optimisticId = `optimistic:${task.id}`;
      const optimisticCompletion: TodayCompletion = {
        completedAt: new Date().toISOString(),
        completedBy: session.user.id,
        completedByName:
          typeof session.user.user_metadata.display_name === 'string'
            ? session.user.user_metadata.display_name
            : 'Ви',
        id: optimisticId,
      };

      setMutationFailure(null);
      setPendingTaskIds((current) => new Set(current).add(task.id));
      setSnapshot((current) =>
        current
          ? withTaskCompletion(
              current,
              task.id,
              shouldComplete ? optimisticCompletion : null,
            )
          : current,
      );

      try {
        const result = shouldComplete
          ? await completeTask(task.id)
          : await uncompleteTask(previousCompletion?.id ?? '');

        if (result.status === 'created') showToast('Задачу виконано');
        if (result.status === 'removed') showToast('Виконання скасовано');
        await loadToday(false);
      } catch (mutationError) {
        setSnapshot((current) => {
          if (!current) return current;
          const currentTask = findTask(current, task.id);
          const ownsOptimisticComplete =
            shouldComplete && currentTask?.completion?.id === optimisticId;
          const stillOptimisticallyUncompleted =
            !shouldComplete && currentTask?.completion === null;

          return ownsOptimisticComplete || stillOptimisticallyUncompleted
            ? withTaskCompletion(current, task.id, previousCompletion)
            : current;
        });
        setMutationFailure({
          action: shouldComplete ? 'complete' : 'uncomplete',
          taskId: task.id,
        });
        showToast(
          getErrorMessage(
            mutationError,
            'Не вдалося оновити задачу. Зміну скасовано.',
          ),
          'error',
        );
      } finally {
        setPendingTaskIds((current) => {
          const next = new Set(current);
          next.delete(task.id);
          return next;
        });
      }
    },
    [loadToday, pendingTaskIds, session, showToast, snapshot],
  );

  const retryMutation = () => {
    if (!mutationFailure) return;
    const task = findTask(snapshot, mutationFailure.taskId);
    if (task) void toggleTask(task, mutationFailure.action === 'complete');
  };

  const visibleChecklists = useMemo(
    () =>
      (snapshot?.checklists ?? [])
        .filter((checklist) => checklist.tasks.length > 0)
        .map((checklist) => ({
          ...checklist,
          tasks: [...checklist.tasks].sort(
            (left, right) =>
              left.position - right.position ||
              left.title.localeCompare(right.title, 'uk'),
          ),
        }))
        .sort(
          (left, right) =>
            left.createdAt.localeCompare(right.createdAt) ||
            left.name.localeCompare(right.name, 'uk'),
        ),
    [snapshot],
  );

  const taskCount = visibleChecklists.reduce(
    (count, checklist) => count + checklist.tasks.length,
    0,
  );
  const completedCount = visibleChecklists.reduce(
    (count, checklist) =>
      count + checklist.tasks.filter((task) => task.completion).length,
    0,
  );

  if (status === 'loading' || !activeTeam || (loading && !snapshot)) {
    return (
      <Page title="Сьогодні">
        <Skeleton />
      </Page>
    );
  }

  if (!snapshot && error) {
    return (
      <Page title="Сьогодні">
        <Alert
          className="flex-col items-start sm:flex-row sm:items-center"
          color="error"
        >
          <span className="flex-1">{error}</span>
          <Button onClick={() => void loadToday(true)} size="sm">
            Повторити
          </Button>
        </Alert>
      </Page>
    );
  }

  return (
    <Page
      title="Сьогодні"
      titleBadge={
        taskCount > 0 ? (
          <Badge size="sm" soft>
            {completedCount} / {taskCount}
          </Badge>
        ) : undefined
      }
    >
      {error ? (
        <Alert
          className="flex-col items-start sm:flex-row sm:items-center"
          color="error"
        >
          <span className="flex-1">{error}</span>
          <Button onClick={refreshToday} size="sm">
            Повторити
          </Button>
        </Alert>
      ) : null}

      {realtimeStatus === 'degraded' ? (
        <Alert
          className="flex-col items-start sm:flex-row sm:items-center"
          color="warning"
        >
          <span className="flex-1">
            Live-оновлення недоступні. Дані можна оновити повторним
            підключенням.
          </span>
          <Button onClick={retryRealtime} size="sm">
            Підключити
          </Button>
        </Alert>
      ) : null}

      {mutationFailure ? (
        <Alert
          className="flex-col items-start sm:flex-row sm:items-center"
          color="error"
        >
          <span className="flex-1">
            Зміну скасовано, бо сервер не підтвердив її.
          </span>
          <Button onClick={retryMutation} size="sm">
            Спробувати ще
          </Button>
        </Alert>
      ) : null}

      {visibleChecklists.length === 0 ? (
        <EmptyState
          description="Команда не має активних задач на цю дату."
          icon="sun"
          title="На сьогодні задач немає"
        />
      ) : (
        visibleChecklists.map((checklist) => (
          <section
            aria-labelledby={`today-checklist-${checklist.id}`}
            key={checklist.id}
          >
            <h2
              className="mb-1 text-xs font-medium tracking-wide text-base-content/60 uppercase"
              id={`today-checklist-${checklist.id}`}
            >
              {checklist.name}
            </h2>
            <ul className="list">
              {checklist.tasks.map((task) => {
                const completion = task.completion;
                const pending = pendingTaskIds.has(task.id);
                const awaitingCanonicalCompletion =
                  completion?.id.startsWith('optimistic:') ?? false;
                const canUndo = Boolean(
                  completion &&
                  (completion.completedBy === session?.user.id ||
                    activeTeam.owner_id === session?.user.id),
                );
                const disabled =
                  pending ||
                  awaitingCanonicalCompletion ||
                  Boolean(completion && !canUndo);

                return (
                  <li
                    className="list-row min-h-14 items-start px-0"
                    key={task.id}
                  >
                    <label
                      className={cn(
                        'grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full',
                        !disabled &&
                          'cursor-pointer focus-within:outline-2 focus-within:outline-primary active:bg-base-200',
                      )}
                    >
                      <input
                        aria-busy={pending}
                        aria-label={
                          completion
                            ? canUndo
                              ? `Скасувати виконання: ${task.title}`
                              : `Виконано: ${task.title}`
                            : `Виконати: ${task.title}`
                        }
                        checked={Boolean(completion)}
                        className="checkbox checkbox-sm checkbox-primary"
                        disabled={disabled}
                        onChange={(event) =>
                          void toggleTask(task, event.currentTarget.checked)
                        }
                        type="checkbox"
                      />
                    </label>
                    <div className="pt-2 list-col-grow">
                      <div
                        className={cn(
                          'text-base',
                          completion &&
                            'text-base-content/60 line-through decoration-base-content/40',
                        )}
                      >
                        {task.title}
                      </div>
                      {completion ? (
                        <div className="mt-0.5 text-sm text-base-content/60">
                          {completion.completedByName || 'Учасник'} ·{' '}
                          {completionTime(
                            completion.completedAt,
                            snapshot?.timezone ?? activeTeam.timezone,
                          )}
                        </div>
                      ) : null}
                    </div>
                    {pending ? (
                      <span
                        aria-label="Збереження"
                        className="loading mt-2 loading-sm loading-spinner"
                        role="status"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </Page>
  );
}
