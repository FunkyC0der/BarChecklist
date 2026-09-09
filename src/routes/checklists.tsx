import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@/lib/router';
import { useNavigate } from '@/lib/router-hooks';

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
import { createChecklist } from '@/features/checklists/checklist-api';
import { ChecklistForm } from '@/features/checklists/checklist-form';
import { checklistListQueryOptions } from '@/features/checklists/checklist-queries';
import { taskCountLabel } from '@/features/checklists/checklist-schedule';
import {
  MAX_ACTIVE_CHECKLISTS_PER_TEAM,
  type ChecklistFormValues,
} from '@/features/checklists/checklist-schema';
import { useTeams } from '@/features/teams/team-context';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';

export function ChecklistsRoute() {
  const toast = useToast();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeTeam, error: teamsError, refreshTeams, status } = useTeams();
  const [createOpen, setCreateOpen] = useState(false);
  const createTriggerRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const checklistQuery = useQuery({
    ...checklistListQueryOptions(activeTeam?.id ?? 'none'),
    enabled: Boolean(activeTeam),
  });
  const createMutation = useMutation({
    mutationFn: (values: ChecklistFormValues) =>
      createChecklist({
        createdBy: session!.user.id,
        name: values.name,
        teamId: activeTeam!.id,
      }),
    onSuccess: async (checklist) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.checklists(activeTeam!.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.todayForTeam(activeTeam!.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.historyForTeam(activeTeam!.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.statsForTeam(activeTeam!.id),
      });
      setCreateOpen(false);
      toast('Чекліст створено');
      navigate(`/checklists/${checklist.id}`);
    },
  });
  const checklists = checklistQuery.data?.checklists ?? [];
  const taskCounts =
    checklistQuery.data?.taskCounts ?? new Map<string, number>();
  const loading = checklistQuery.isLoading;
  const error = checklistQuery.error
    ? getErrorMessage(checklistQuery.error, 'Не вдалося завантажити чеклісти.')
    : null;

  const isOwner = Boolean(
    activeTeam && session?.user.id === activeTeam.owner_id,
  );
  const atChecklistLimit = checklists.length >= MAX_ACTIVE_CHECKLISTS_PER_TEAM;

  const submitCreate = async (values: ChecklistFormValues) => {
    if (activeTeam && session) await createMutation.mutateAsync(values);
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
              onClick={() => void checklistQuery.refetch()}
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
              <Button
                color="primary"
                onClick={(event) => {
                  createTriggerRef.current = event.currentTarget;
                  setCreateOpen(true);
                }}
              >
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
          ref={createTriggerRef}
        />
      ) : null}

      <Sheet
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        title="Новий чекліст"
        triggerRef={createTriggerRef}
      >
        {createOpen ? (
          <ChecklistForm onSubmit={submitCreate} submitLabel="Створити" />
        ) : null}
      </Sheet>
    </Page>
  );
}
