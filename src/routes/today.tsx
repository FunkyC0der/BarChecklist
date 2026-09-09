import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from '@/lib/router';

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
  type TodaySnapshot,
  uncompleteTask,
} from '@/features/completions/today-api';
import { todaySnapshotQueryOptions } from '@/features/completions/today-queries';
import { useTodayRealtimeStatus } from '@/features/completions/today-realtime-context';
import { useLogicalDateRefresh } from '@/features/completions/use-logical-date-refresh';
import { useTeams } from '@/features/teams/team-context';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errors';
import { logicalDate } from '@/lib/dates';
import { queryKeys } from '@/lib/query-client';

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
  const { activeTeam, error: teamsError, refreshTeams, status } = useTeams();
  const teamId = activeTeam?.id ?? null;
  const teamTimeZone = activeTeam?.timezone ?? 'UTC';
  const [, refreshLogicalDate] = useState(0);
  const todayDate = logicalDate(new Date(), teamTimeZone);
  const reducedMotion = useReducedMotion();
  const [mutationFailure, setMutationFailure] =
    useState<MutationFailure | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const queryClient = useQueryClient();
  const completionMutation = useMutation({
    mutationFn: ({
      completionId,
      shouldComplete,
      taskId,
    }: {
      completionId: string;
      shouldComplete: boolean;
      taskId: string;
    }) =>
      shouldComplete ? completeTask(taskId) : uncompleteTask(completionId),
  });
  const todayQuery = useQuery({
    ...todaySnapshotQueryOptions(teamId ?? 'none', todayDate),
    enabled: Boolean(teamId),
  });
  const snapshot = todayQuery.data ?? null;
  const loading = todayQuery.isLoading;
  const error = todayQuery.error
    ? getErrorMessage(todayQuery.error, 'Не вдалося завантажити задачі.')
    : null;

  const refreshToday = useCallback(() => {
    void todayQuery.refetch();
  }, [todayQuery]);

  const { retry: retryRealtime, status: realtimeStatus } =
    useTodayRealtimeStatus();

  useLogicalDateRefresh({
    logicalDate: snapshot?.logicalDate ?? null,
    onRefresh: () => refreshLogicalDate((version) => version + 1),
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
      await queryClient.cancelQueries({
        queryKey: queryKeys.today(teamId!, todayDate),
      });
      queryClient.setQueryData<TodaySnapshot>(
        queryKeys.today(teamId!, todayDate),
        (current) =>
          current
            ? withTaskCompletion(
                current,
                task.id,
                shouldComplete ? optimisticCompletion : null,
              )
            : current,
      );

      try {
        const result = await completionMutation.mutateAsync({
          completionId: previousCompletion?.id ?? '',
          shouldComplete,
          taskId: task.id,
        });

        if (result.status === 'created') showToast('Задачу виконано');
        if (result.status === 'removed') showToast('Виконання скасовано');
        await queryClient.invalidateQueries({
          queryKey: queryKeys.todayForTeam(teamId!),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.historyForTeam(teamId!),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.statsForTeam(teamId!),
        });
      } catch (mutationError) {
        queryClient.setQueryData<TodaySnapshot>(
          queryKeys.today(teamId!, todayDate),
          (current) => {
            if (!current) return current;
            const currentTask = findTask(current, task.id);
            const ownsOptimisticComplete =
              shouldComplete && currentTask?.completion?.id === optimisticId;
            const stillOptimisticallyUncompleted =
              !shouldComplete && currentTask?.completion === null;

            return ownsOptimisticComplete || stillOptimisticallyUncompleted
              ? withTaskCompletion(current, task.id, previousCompletion)
              : current;
          },
        );
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
    [
      completionMutation,
      pendingTaskIds,
      queryClient,
      session,
      setMutationFailure,
      setPendingTaskIds,
      showToast,
      snapshot,
      teamId,
      todayDate,
    ],
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
  const completionRatio = taskCount ? completedCount / taskCount : 0;

  if (status === 'idle' || status === 'loading') {
    return (
      <Page title="Сьогодні">
        <Skeleton />
      </Page>
    );
  }

  if (status === 'error') {
    return (
      <Page title="Сьогодні">
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
  }

  if (!activeTeam) {
    return (
      <Page title="Сьогодні">
        <EmptyState
          action={
            <Link className="btn btn-primary" to="/team">
              Створити команду
            </Link>
          }
          description="Створіть команду, щоб додати чеклісти й бачити задачі на сьогодні."
          icon="users"
          title="Почніть із команди"
        />
      </Page>
    );
  }

  if (loading && !snapshot) {
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
          <Button onClick={() => void todayQuery.refetch()} size="sm">
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
      {taskCount > 0 ? (
        <div
          aria-label={`Виконано ${completedCount} з ${taskCount}`}
          aria-valuemax={taskCount}
          aria-valuemin={0}
          aria-valuenow={completedCount}
          className="h-1 overflow-hidden rounded-full bg-base-200"
          role="progressbar"
        >
          <div
            className="app-progress-fill h-full w-full rounded-full bg-primary motion-reduce:transition-none"
            style={{ transform: `scaleX(${completionRatio})` }}
          />
        </div>
      ) : null}
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
                  <motion.li
                    animate={{
                      opacity: 1,
                      transform: completion
                        ? 'translateY(0) scale(0.995)'
                        : 'translateY(0) scale(1)',
                    }}
                    className="list-row min-h-14 items-start px-0"
                    initial={false}
                    key={task.id}
                    transition={{
                      duration: reducedMotion ? 0.01 : 0.18,
                      ease: 'easeOut',
                    }}
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
                          'text-base transition-[color,text-decoration-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
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
                  </motion.li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </Page>
  );
}
