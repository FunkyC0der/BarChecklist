import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';

import {
  Alert,
  AppText,
  Badge,
  Button,
  EmptyState,
  Loading,
  Modal,
  Screen,
} from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import {
  createChecklist,
  fetchActiveTaskCounts,
  fetchChecklists,
  type Checklist,
} from '@/features/checklists/checklist-api';
import { ChecklistForm } from '@/features/checklists/checklist-form';
import {
  cadenceLabel,
  formatChecklistSchedule,
  taskCountLabel,
} from '@/features/checklists/checklist-schedule';
import {
  MAX_ACTIVE_CHECKLISTS_PER_TEAM,
  type ChecklistFormValues,
} from '@/features/checklists/checklist-schema';
import { useTeams } from '@/features/teams/team-context';
import { getErrorMessage } from '@/lib/errors';

export function ChecklistsRoute() {
  const { session } = useAuth();
  const { activeTeam, status } = useTeams();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [taskCounts, setTaskCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const isOwner = Boolean(
    activeTeam && session?.user.id === activeTeam.owner_id,
  );
  const atChecklistLimit = checklists.length >= MAX_ACTIVE_CHECKLISTS_PER_TEAM;

  const loadChecklists = useCallback(async () => {
    if (!activeTeam) return;

    setLoading(true);
    setError(null);
    try {
      const nextChecklists = await fetchChecklists(activeTeam.id);
      setChecklists(nextChecklists);
      setTaskCounts(
        await fetchActiveTaskCounts(
          nextChecklists.map((checklist) => checklist.id),
        ),
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Не вдалося завантажити чеклісти.'));
    } finally {
      setLoading(false);
    }
  }, [activeTeam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadChecklists();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadChecklists]);

  const submitCreate = async (values: ChecklistFormValues) => {
    if (!activeTeam || !session) return;

    await createChecklist({
      cadence: values.cadence,
      createdBy: session.user.id,
      name: values.name,
      teamId: activeTeam.id,
      weekdays: values.weekdays,
    });
    setCreateOpen(false);
    await loadChecklists();
  };

  if (status === 'loading' || !activeTeam) {
    return (
      <Screen inset scroll={false}>
        <Loading label="Завантажуємо чеклісти…" size="lg" />
      </Screen>
    );
  }

  return (
    <Screen inset>
      <div className="navbar min-h-0 px-0">
        <div className="navbar-start">
          <h1 className="text-xl font-semibold">Чеклісти</h1>
        </div>
        {isOwner ? (
          <div className="navbar-end">
            <Button
              color="primary"
              disabled={atChecklistLimit}
              onClick={() => setCreateOpen(true)}
              size="sm"
            >
              Створити
            </Button>
          </div>
        ) : null}
      </div>

      {atChecklistLimit && isOwner ? (
        <Alert color="warning">
          У команди може бути щонайбільше {MAX_ACTIVE_CHECKLISTS_PER_TEAM}{' '}
          активних чеклістів.
        </Alert>
      ) : null}

      {error ? <Alert color="error">{error}</Alert> : null}

      {loading ? <Loading label="Завантажуємо чеклісти…" /> : null}

      {!loading && checklists.length === 0 ? (
        <EmptyState
          action={
            isOwner && !atChecklistLimit ? (
              <Button onClick={() => setCreateOpen(true)}>
                Створити чекліст
              </Button>
            ) : undefined
          }
          description={
            isOwner
              ? 'Додайте перший daily або weekly чекліст для команди.'
              : 'Owner ще не додав жодного чекліста.'
          }
          title="Чеклістів поки немає"
        />
      ) : null}

      {!loading && checklists.length > 0 ? (
        <ul className="list">
          {checklists.map((checklist) => (
            <li className="list-row" key={checklist.id}>
              <Link
                className="list-col-grow"
                to={`/checklists/${checklist.id}`}
              >
                <AppText variant="label">{checklist.name}</AppText>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge className="badge-ghost">
                    {cadenceLabel(checklist.cadence)}
                  </Badge>
                  <AppText tone="muted" variant="caption">
                    {formatChecklistSchedule(checklist)}
                  </AppText>
                  <AppText tone="muted" variant="caption">
                    {taskCountLabel(taskCounts.get(checklist.id) ?? 0)}
                  </AppText>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {!isOwner && !loading ? (
        <AppText tone="muted">Лише owner може змінювати структуру.</AppText>
      ) : null}

      <Modal
        description="Назва, cadence і дні розкладу задають, коли чекліст з’явиться в «Сьогодні»."
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        title="Новий чекліст"
      >
        <ChecklistForm
          onCancel={() => setCreateOpen(false)}
          onSubmit={submitCreate}
          submitLabel="Створити"
        />
      </Modal>
    </Screen>
  );
}
