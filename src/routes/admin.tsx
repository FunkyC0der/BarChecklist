import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  Alert,
  Button,
  Card,
  EmptyState,
  Page,
  Skeleton,
} from '@/components/ui';
import {
  platformOverviewQueryOptions,
  platformTeamsQueryOptions,
} from '@/features/admin/admin-queries';
import {
  platformTeamSortOptions,
  type PlatformTeam,
  type PlatformTeamSort,
} from '@/features/admin/admin-api';
import { getErrorMessage } from '@/lib/errors';

const teamsPageSize = 50;

const sortLabels: Record<PlatformTeamSort, string> = {
  recent_activity: 'Остання активність',
  created: 'Дата створення',
  members: 'Кількість учасників',
  completions: 'Кількість виконань',
};

const numberFormat = new Intl.NumberFormat('uk-UA');
function formatNumber(value: number) {
  return numberFormat.format(value);
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card bodyClassName="gap-1 p-4">
      <span className="text-xs font-medium tracking-wide text-base-content/60 uppercase">
        {label}
      </span>
      <span className="text-2xl font-bold tracking-tight">{value}</span>
    </Card>
  );
}

function TeamRow({ team }: { team: PlatformTeam }) {
  return (
    <tr>
      <td>
        <div className="flex flex-col">
          <span className="font-medium">{team.name}</span>
          <span className="text-xs text-base-content/60">
            {team.ownerName} · {team.ownerEmail}
          </span>
        </div>
      </td>
      <td>{formatNumber(team.memberCount)}</td>
      <td>{formatNumber(team.checklistCount)}</td>
      <td>{formatNumber(team.taskCount)}</td>
      <td>{formatNumber(team.completionCount)}</td>
      <td>
        {team.lastCompletionAt ? formatDateTime(team.lastCompletionAt) : '—'}
      </td>
      <td>{team.hasOpenInvite ? 'Так' : 'Ні'}</td>
    </tr>
  );
}

export function AdminRoute() {
  const [sort, setSort] = useState<PlatformTeamSort>('recent_activity');
  const [offset, setOffset] = useState(0);
  const [teams, setTeams] = useState<Array<PlatformTeam>>([]);
  const [total, setTotal] = useState<number | null>(null);
  const loadedOffset = useRef<number | null>(null);

  const overviewQuery = useQuery(platformOverviewQueryOptions());
  const teamsQuery = useQuery(
    platformTeamsQueryOptions({ limit: teamsPageSize, offset, sort }),
  );

  useEffect(() => {
    if (!teamsQuery.data || loadedOffset.current === offset) return;
    loadedOffset.current = offset;
    setTotal(teamsQuery.data.total);
    setTeams((current) =>
      offset === 0
        ? teamsQuery.data.teams
        : [...current, ...teamsQuery.data.teams],
    );
  }, [teamsQuery.data, offset]);

  const changeSort = (nextSort: PlatformTeamSort) => {
    setSort(nextSort);
    setOffset(0);
    setTeams([]);
    setTotal(null);
    loadedOffset.current = null;
  };

  const overview = overviewQuery.data ?? null;
  const overviewError = overviewQuery.error
    ? getErrorMessage(overviewQuery.error, 'Не вдалося завантажити метрики.')
    : null;
  const teamsError = teamsQuery.error
    ? getErrorMessage(teamsQuery.error, 'Не вдалося завантажити команди.')
    : null;

  const canShowMore = total !== null && teams.length < total;

  return (
    <Page back="/today" title="Адмінка">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <section>
          <h2 className="mb-2 text-xs font-medium tracking-wide text-base-content/60 uppercase">
            Тотали
          </h2>
          {overviewQuery.isLoading ? (
            <Skeleton rows={3} />
          ) : overviewError ? (
            <Alert color="error">
              <span className="flex-1">{overviewError}</span>
              <Button onClick={() => void overviewQuery.refetch()} size="sm">
                Повторити
              </Button>
            </Alert>
          ) : overview ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Юзери"
                value={formatNumber(overview.totals.users)}
              />
              <StatCard
                label="Команди"
                value={formatNumber(overview.totals.teams)}
              />
              <StatCard
                label="Учасники"
                value={formatNumber(overview.totals.memberships)}
              />
              <StatCard
                label="Чеклісти"
                value={formatNumber(overview.totals.checklists)}
              />
              <StatCard
                label="Задачі"
                value={formatNumber(overview.totals.tasks)}
              />
              <StatCard
                label="Виконання"
                value={formatNumber(overview.totals.completions)}
              />
              <StatCard
                label="Відкриті інвайти"
                value={formatNumber(overview.totals.openInvites)}
              />
            </div>
          ) : null}
        </section>

        {overview ? (
          <section>
            <h2 className="mb-2 text-xs font-medium tracking-wide text-base-content/60 uppercase">
              Динаміка
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Нові юзери, 7д / 30д"
                value={`+${formatNumber(overview.growth.usersLast7)} / +${formatNumber(overview.growth.usersLast30)}`}
              />
              <StatCard
                label="Нові команди, 7д / 30д"
                value={`+${formatNumber(overview.growth.teamsLast7)} / +${formatNumber(overview.growth.teamsLast30)}`}
              />
              <StatCard
                label="Виконання, 7д / 30д"
                value={`+${formatNumber(overview.growth.completionsLast7)} / +${formatNumber(overview.growth.completionsLast30)}`}
              />
              <StatCard
                label="Активні команди, 7д / 30д"
                value={`${formatNumber(overview.activity.activeTeamsLast7)} / ${formatNumber(overview.activity.activeTeamsLast30)}`}
              />
              <StatCard
                label="Активні юзери, 7д / 30д"
                value={`${formatNumber(overview.activity.activeUsersLast7)} / ${formatNumber(overview.activity.activeUsersLast30)}`}
              />
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-xs font-medium tracking-wide text-base-content/60 uppercase">
              Команди
            </h2>
            <label className="fieldset">
              <select
                aria-label="Сортування команд"
                className="select select-sm"
                onChange={(event) =>
                  changeSort(event.target.value as PlatformTeamSort)
                }
                value={sort}
              >
                {platformTeamSortOptions.map((option) => (
                  <option key={option} value={option}>
                    {sortLabels[option]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {teamsQuery.isLoading && teams.length === 0 ? (
            <Skeleton rows={5} />
          ) : teamsError ? (
            <Alert color="error">
              <span className="flex-1">{teamsError}</span>
              <Button onClick={() => void teamsQuery.refetch()} size="sm">
                Повторити
              </Button>
            </Alert>
          ) : teams.length === 0 ? (
            <EmptyState
              description="Ще немає жодної команди."
              icon="users"
              title="Команд немає"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Команда</th>
                      <th>Учасники</th>
                      <th>Чеклісти</th>
                      <th>Задачі</th>
                      <th>Виконання</th>
                      <th>Остання активність</th>
                      <th>Відкритий інвайт</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team) => (
                      <TeamRow key={team.id} team={team} />
                    ))}
                  </tbody>
                </table>
              </div>
              {canShowMore ? (
                <div className="mt-3 flex justify-center">
                  <Button
                    onClick={() =>
                      setOffset((current) => current + teamsPageSize)
                    }
                    variant="soft"
                  >
                    Показати ще
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </Page>
  );
}
