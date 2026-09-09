import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from '@/lib/router-hooks';

import {
  Alert,
  Badge,
  Button,
  EmptyState,
  ListRow,
  Page,
  Skeleton,
} from '@/components/ui';
import type { StatsFilters } from '@/features/stats/stats-api';
import { memberTaskStatsQueryOptions } from '@/features/stats/stats-queries';
import { useTeams } from '@/features/teams/team-context';
import { getErrorMessage } from '@/lib/errors';
import { isPermissionError } from '@/lib/log-error';

function filtersFromParams(params: URLSearchParams): StatsFilters {
  return {
    checklistId: params.get('checklist'),
    fromDate: params.get('from'),
    toDate: params.get('to'),
  };
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

export function HistoryStatsMemberRoute() {
  const { activeTeam, error: teamsError, refreshTeams, status } = useTeams();
  const teamId = activeTeam?.id ?? null;
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const filters = filtersFromParams(searchParams);
  const back = `/history/stats?${searchParams.toString()}`;

  const taskStatsQuery = useQuery({
    ...memberTaskStatsQueryOptions(teamId ?? 'none', userId ?? 'none', filters),
    enabled: Boolean(teamId && userId),
  });
  const memberStats = taskStatsQuery.data ?? null;
  const loading = taskStatsQuery.isLoading;
  const error =
    taskStatsQuery.error && !isPermissionError(taskStatsQuery.error)
      ? getErrorMessage(
          taskStatsQuery.error,
          'Не вдалося завантажити статистику учасника.',
        )
      : null;
  const permissionDenied = isPermissionError(taskStatsQuery.error);
  const retry = () => void taskStatsQuery.refetch();
  const title = memberStats?.displayName ?? 'Учасник';

  if (status === 'idle' || status === 'loading' || (loading && !memberStats))
    return (
      <Page back={back} title="Учасник">
        <Skeleton rows={5} />
      </Page>
    );
  if (status === 'error')
    return (
      <Page back={back} title="Учасник">
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
  if (permissionDenied)
    return (
      <Page back={back} title="Учасник">
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
  if (error)
    return (
      <Page back={back} title="Учасник">
        <Alert color="error">
          <span className="flex-1">{error}</span>
          <Button onClick={retry} size="sm">
            Повторити
          </Button>
        </Alert>
      </Page>
    );

  const groups = new Map<
    string,
    {
      checklistId: string;
      checklistName: string;
      checklistArchived: boolean;
      tasks: NonNullable<typeof memberStats>['tasks'];
    }
  >();
  for (const task of memberStats?.tasks ?? []) {
    const group = groups.get(task.checklistId);
    if (group) {
      group.tasks.push(task);
    } else {
      groups.set(task.checklistId, {
        checklistArchived: task.checklistArchived,
        checklistId: task.checklistId,
        checklistName: task.checklistName,
        tasks: [task],
      });
    }
  }

  return (
    <Page
      back={back}
      title={title}
      titleBadge={
        !memberStats?.currentMember ? (
          <Badge size="sm" soft>
            Колишній учасник
          </Badge>
        ) : undefined
      }
    >
      {groups.size === 0 ? (
        <EmptyState
          description="Цей учасник ще нічого не виконав за період."
          icon="clipboard-list"
          title="Немає виконаних завдань"
        />
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(groups.values()).map((group) => (
            <section
              aria-labelledby={`stats-checklist-${group.checklistId}`}
              key={group.checklistId}
            >
              <h2
                className="mb-1 flex items-center gap-2 text-xs font-medium tracking-wide text-base-content/60 uppercase"
                id={`stats-checklist-${group.checklistId}`}
              >
                {group.checklistName}
                {group.checklistArchived ? (
                  <Badge size="sm" soft>
                    Архівний
                  </Badge>
                ) : null}
              </h2>
              <ul
                aria-labelledby={`stats-checklist-${group.checklistId}`}
                className="list"
              >
                {group.tasks.map((task) => (
                  <ListRow
                    key={task.taskId}
                    meta={
                      task.lastCompletionDate
                        ? `Востаннє ${dateLabel(task.lastCompletionDate)}`
                        : undefined
                    }
                    title={task.taskTitle}
                    trailing={<Badge soft>{task.completedCount}</Badge>}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
