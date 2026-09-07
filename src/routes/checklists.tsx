import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Fab,
  Icon,
  ListRow,
  Page,
  Sheet,
  Skeleton,
} from '@/components/ui';
import { IconTile } from '@/components/ui/list-row';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/features/auth/auth-context';
import {
  createChecklist,
  fetchActiveTaskCounts,
  fetchChecklists,
  type Checklist,
} from '@/features/checklists/checklist-api';
import { ChecklistForm } from '@/features/checklists/checklist-form';
import { taskCountLabel } from '@/features/checklists/checklist-schedule';
import {
  MAX_ACTIVE_CHECKLISTS_PER_TEAM,
  type ChecklistFormValues,
} from '@/features/checklists/checklist-schema';
import { useTeams } from '@/features/teams/team-context';
import { getErrorMessage } from '@/lib/errors';

export function ChecklistsRoute() {
  const toast = useToast();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeTeam, error: teamsError, refreshTeams, status } = useTeams();
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

    const checklist = await createChecklist({
      createdBy: session.user.id,
      name: values.name,
      teamId: activeTeam.id,
    });
    setCreateOpen(false);
    toast('Чекліст створено');
    navigate(`/checklists/${checklist.id}`);
  };

  if (status === 'idle' || status === 'loading') {
    return (
      <Page title="Чеклісти">
        <Skeleton />
      </Page>
    );
  }

  if (status === 'error') {
    return (
      <Page title="Чеклісти">
        <Alert color="error">
          <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
            <span>{teamsError ?? 'Не вдалося завантажити команди.'}</span>
            <Button onClick={() => void refreshTeams()} size="sm">
              Повторити
            </Button>
          </div>
        </Alert>
      </Page>
    );
  }

  if (!activeTeam) {
    return (
      <Page title="Чеклісти">
        <EmptyState
          action={
            <Link className="btn btn-primary" to="/team">
              Створити команду
            </Link>
          }
          description="Спочатку створіть команду, а потім додайте її чеклісти."
          icon="clipboard-list"
          title="Команди ще немає"
        />
      </Page>
    );
  }

  return (
    <Page
      title="Чеклісти"
      titleBadge={
        isOwner ? (
          <Badge size="sm" soft>
            {`${checklists.length} / ${MAX_ACTIVE_CHECKLISTS_PER_TEAM}`}
          </Badge>
        ) : undefined
      }
    >
      {error ? (
        <Alert color="error">
          <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void loadChecklists()}
            >
              Повторити
            </Button>
          </div>
        </Alert>
      ) : null}

      {loading ? <Skeleton /> : null}

      {!loading && checklists.length === 0 ? (
        <EmptyState
          action={
            isOwner && !atChecklistLimit ? (
              <Button color="primary" onClick={() => setCreateOpen(true)}>
                Створити чекліст
              </Button>
            ) : undefined
          }
          description={
            isOwner
              ? 'Додайте перший чекліст для команди.'
              : 'Owner ще не додав жодного чекліста.'
          }
          icon="clipboard-list"
          title="Чеклістів поки немає"
        />
      ) : null}

      {!loading && checklists.length > 0 ? (
        <ul className="list">
          {checklists.map((checklist) => (
            <ListRow
              key={checklist.id}
              leading={<IconTile icon="clipboard-list" />}
              meta={taskCountLabel(taskCounts.get(checklist.id) ?? 0)}
              title={checklist.name}
              to={`/checklists/${checklist.id}`}
              trailing={
                <Icon className="text-base-content/40" name="chevron-right" />
              }
            />
          ))}
        </ul>
      ) : null}

      {isOwner ? (
        <Fab
          disabled={atChecklistLimit}
          disabledHint="Ліміт 20 чеклістів"
          label="Створити чекліст"
          onClick={() => setCreateOpen(true)}
        />
      ) : null}

      <Sheet
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        title="Новий чекліст"
      >
        {createOpen ? (
          <ChecklistForm onSubmit={submitCreate} submitLabel="Створити" />
        ) : null}
      </Sheet>
    </Page>
  );
}
