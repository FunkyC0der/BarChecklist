import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Menu } from '@base-ui/react/menu';
import { Navigate } from '@/lib/router';
import { useNavigate, useParams } from '@/lib/router-hooks';

import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Fab,
  Icon,
  IconButton,
  Page,
  Sheet,
  Skeleton,
} from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/features/auth/auth-context';
import {
  createTask,
  deleteChecklist,
  deleteTask,
  fetchChecklist,
  fetchTasks,
  reorderTasks,
  updateChecklist,
  updateTask,
  type Task,
} from '@/features/checklists/checklist-api';
import { ChecklistForm } from '@/features/checklists/checklist-form';
import {
  MAX_ACTIVE_TASKS_PER_CHECKLIST,
  type ChecklistFormValues,
  type TaskFormValues,
} from '@/features/checklists/checklist-schema';
import { SortableTaskList } from '@/features/checklists/sortable-task-list';
import { TaskForm } from '@/features/checklists/task-form';
import { useTeams } from '@/features/teams/team-context';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';

type Dialog =
  | { type: 'create-task' }
  | { type: 'delete-checklist' }
  | { type: 'delete-task'; task: Task }
  | { type: 'edit-checklist' }
  | { type: 'edit-task'; task: Task }
  | null;

export function ChecklistDetailRoute() {
  const toast = useToast();
  const { checklistId } = useParams<{ checklistId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeTeam, status } = useTeams();
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Shared across all five Sheets below: only one `dialog` is ever open at
  // a time, so one ref is enough to send focus back to whichever page
  // element (or task row) actually opened it. Menu-originated delete requests
  // carry the stable account-menu trigger in their custom-event detail.
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    enabled: Boolean(activeTeam && checklistId),
    queryFn: async () => {
      const checklist = await fetchChecklist(checklistId!);
      if (!checklist || checklist.team_id !== activeTeam!.id) return null;
      return { checklist, tasks: await fetchTasks(checklist.id) };
    },
    queryKey: queryKeys.checklist(
      activeTeam?.id ?? 'none',
      checklistId ?? 'none',
    ),
  });
  const checklist = detailQuery.data?.checklist ?? null;
  const tasks = detailQuery.data?.tasks ?? [];
  const loading = detailQuery.isLoading;
  const notFound = detailQuery.isSuccess && !detailQuery.data;

  const isOwner = Boolean(
    activeTeam && session?.user.id === activeTeam.owner_id,
  );
  const atTaskLimit = tasks.length >= MAX_ACTIVE_TASKS_PER_CHECKLIST;

  const invalidateDetail = async () => {
    if (activeTeam && checklistId) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.checklist(activeTeam.id, checklistId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.checklists(activeTeam.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.todayForTeam(activeTeam.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.historyForTeam(activeTeam.id),
      });
    }
  };
  const updateChecklistMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ChecklistFormValues }) =>
      updateChecklist(id, values),
  });
  const createTaskMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: TaskFormValues }) =>
      createTask(id, values),
  });
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: TaskFormValues }) =>
      updateTask(id, values),
  });
  const deleteChecklistMutation = useMutation({
    mutationFn: deleteChecklist,
    onSuccess: async () => {
      if (activeTeam)
        await queryClient.invalidateQueries({
          queryKey: queryKeys.checklists(activeTeam.id),
        });
      if (activeTeam) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.todayForTeam(activeTeam.id),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.historyForTeam(activeTeam.id),
        });
      }
    },
  });
  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
  });
  const reorderMutation = useMutation({
    mutationFn: ({
      checklistId: id,
      taskIds,
    }: {
      checklistId: string;
      taskIds: string[];
    }) => reorderTasks(id, taskIds),
  });

  const closeDialog = () => {
    setDialog(null);
    setDeleteError(null);
  };

  const openDialog = (nextDialog: Exclude<Dialog, null>) => {
    setDeleteError(null);
    setDialog(nextDialog);
  };

  useEffect(() => {
    const onDeleteRequest = (event: Event) => {
      const trigger = (event as CustomEvent<{ trigger?: HTMLElement | null }>)
        .detail?.trigger;
      if (trigger) dialogTriggerRef.current = trigger;
      if (isOwner) openDialog({ type: 'delete-checklist' });
    };
    window.addEventListener('checklister:delete-checklist', onDeleteRequest);
    return () =>
      window.removeEventListener(
        'checklister:delete-checklist',
        onDeleteRequest,
      );
  }, [isOwner]);

  const submitChecklistEdit = async (values: ChecklistFormValues) => {
    if (!checklist) return;
    await updateChecklistMutation.mutateAsync({ id: checklist.id, values });
    closeDialog();
    toast('Чекліст збережено');
    await invalidateDetail();
  };

  const submitTaskCreate = async (values: TaskFormValues) => {
    if (!checklist) return;
    await createTaskMutation.mutateAsync({ id: checklist.id, values });
    closeDialog();
    toast('Задачу додано');
    await invalidateDetail();
  };

  const submitTaskEdit = async (values: TaskFormValues) => {
    if (dialog?.type !== 'edit-task') return;
    await updateTaskMutation.mutateAsync({ id: dialog.task.id, values });
    closeDialog();
    toast('Задачу збережено');
    await invalidateDetail();
  };

  const confirmDeleteChecklist = async () => {
    if (!checklist) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteChecklistMutation.mutateAsync(checklist.id);
      navigate('/checklists', { replace: true });
    } catch (deleteFailure) {
      setDeleteError(
        getErrorMessage(deleteFailure, 'Не вдалося видалити чекліст.'),
      );
      setDeleting(false);
    }
  };

  const confirmDeleteTask = async () => {
    if (dialog?.type !== 'delete-task') return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTaskMutation.mutateAsync(dialog.task.id);
      closeDialog();
      toast('Задачу видалено');
      await invalidateDetail();
    } catch (deleteFailure) {
      setDeleteError(
        getErrorMessage(deleteFailure, 'Не вдалося видалити задачу.'),
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleReorder = async (ids: string[]) => {
    if (!checklist) return;

    setReorderError(null);
    try {
      await reorderMutation.mutateAsync({
        checklistId: checklist.id,
        taskIds: ids,
      });
      toast('Порядок збережено');
    } catch (reorderFailure) {
      setReorderError(
        getErrorMessage(reorderFailure, 'Не вдалося змінити порядок.'),
      );
      throw reorderFailure;
    } finally {
      await invalidateDetail();
    }
  };

  if (status === 'idle' || status === 'loading') {
    return (
      <Page back="/checklists" hideTitle title=" ">
        <Skeleton />
      </Page>
    );
  }

  if (!activeTeam) return <Navigate replace to="/today" />;

  if (loading) {
    return (
      <Page back="/checklists" hideTitle title=" ">
        <Skeleton />
      </Page>
    );
  }

  // A failed *refetch* (offline drag, background/focus refetch) flips the
  // query to `status: "error"` while it keeps serving the previous data.
  // Only a failure with nothing to show may replace the page; otherwise the
  // load error is rendered inline below, next to `reorderError`, so the task
  // list, the FAB and the sheets stay mounted.
  const loadErrorAlert = detailQuery.isError ? (
    <Alert color="error">
      <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
        <span>
          {getErrorMessage(
            detailQuery.error,
            'Не вдалося завантажити чекліст.',
          )}
        </span>
        <Button
          color="primary"
          size="sm"
          onClick={() => void detailQuery.refetch()}
        >
          Повторити
        </Button>
      </div>
    </Alert>
  ) : null;

  if (detailQuery.isError && !detailQuery.data) {
    return (
      <Page back="/checklists" title="Чекліст">
        {loadErrorAlert}
      </Page>
    );
  }

  if (notFound || !checklist) {
    return (
      <Page back="/checklists" title="Чекліст не знайдено">
        <EmptyState
          description="Його видалено або він не належить цій команді."
          icon="clipboard-list"
          title="Чекліст не знайдено"
        />
      </Page>
    );
  }

  return (
    <Page
      actions={
        isOwner ? (
          <>
            <IconButton
              icon="pencil"
              label="Редагувати назву"
              onClick={(event) => {
                dialogTriggerRef.current = event.currentTarget;
                openDialog({ type: 'edit-checklist' });
              }}
            />
          </>
        ) : undefined
      }
      back="/checklists"
      title={checklist.name}
      titleBadge={
        isOwner ? (
          <Badge size="sm" soft>
            {`${tasks.length} / ${MAX_ACTIVE_TASKS_PER_CHECKLIST}`}
          </Badge>
        ) : undefined
      }
    >
      {reorderError ? <Alert color="error">{reorderError}</Alert> : null}
      {loadErrorAlert}

      {tasks.length === 0 ? (
        <EmptyState
          description={
            isOwner
              ? 'Додайте першу задачу. Порядок можна змінити перетягуванням.'
              : 'У цьому чеклісті ще немає задач.'
          }
          icon="clipboard-list"
          title="Задач поки немає"
        />
      ) : (
        <SortableTaskList
          isOwner={isOwner}
          onReorder={handleReorder}
          onSelect={
            isOwner
              ? (task, element) => {
                  dialogTriggerRef.current = element;
                  openDialog({ task, type: 'edit-task' });
                }
              : undefined
          }
          tasks={tasks}
        />
      )}

      {isOwner ? (
        <Fab
          disabled={atTaskLimit}
          disabledHint="Ліміт 100 задач"
          label="Додати задачу"
          onClick={() => {
            dialogTriggerRef.current = fabRef.current;
            openDialog({ type: 'create-task' });
          }}
          ref={fabRef}
        />
      ) : null}

      <Sheet
        onClose={closeDialog}
        triggerRef={dialogTriggerRef}
        open={dialog?.type === 'edit-checklist'}
        title="Редагувати чекліст"
      >
        {dialog?.type === 'edit-checklist' ? (
          <ChecklistForm
            initialValues={{ name: checklist.name }}
            onSubmit={submitChecklistEdit}
            submitLabel="Зберегти"
          />
        ) : null}
      </Sheet>

      <Sheet
        description="Чекліст зникне з розділу «Сьогодні». Історія виконань збережеться, але відновити його в цьому інтерфейсі не можна."
        onClose={closeDialog}
        triggerRef={dialogTriggerRef}
        open={dialog?.type === 'delete-checklist'}
        title="Видалити чекліст?"
      >
        {deleteError ? (
          <Alert aria-live="polite" color="error">
            {deleteError}
          </Alert>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button className="btn-block" onClick={closeDialog} variant="ghost">
            Скасувати
          </Button>
          <Button
            className="btn-block"
            color="error"
            loading={deleting || deleteChecklistMutation.isPending}
            onClick={() => void confirmDeleteChecklist()}
          >
            Видалити
          </Button>
        </div>
      </Sheet>

      <Sheet
        onClose={closeDialog}
        triggerRef={dialogTriggerRef}
        open={dialog?.type === 'create-task'}
        title="Нова задача"
      >
        {dialog?.type === 'create-task' ? (
          <TaskForm
            checklistName={checklist.name}
            onSubmit={submitTaskCreate}
            submitLabel="Додати"
          />
        ) : null}
      </Sheet>

      <Sheet
        ariaLabel="Редагування задачі"
        more={
          dialog?.type === 'edit-task' ? (
            <Menu.Root modal={false}>
              <Menu.Trigger
                aria-label="Ще"
                className="btn btn-circle btn-ghost"
              >
                <Icon name="more-horizontal" />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner
                  align="end"
                  className="dropdown dropdown-end z-30"
                  side="bottom"
                >
                  <Menu.Popup
                    render={
                      <ul className="app-menu-popup menu dropdown-content w-52 rounded-box bg-base-100 shadow-sm" />
                    }
                  >
                    <li>
                      <Menu.Item
                        className="text-error"
                        nativeButton
                        onClick={() => {
                          if (dialog?.type !== 'edit-task') return;
                          const task = dialog.task;
                          closeDialog();
                          queueMicrotask(() =>
                            openDialog({ task, type: 'delete-task' }),
                          );
                        }}
                        render={<button type="button" />}
                      >
                        Видалити задачу
                      </Menu.Item>
                    </li>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          ) : undefined
        }
        onClose={closeDialog}
        triggerRef={dialogTriggerRef}
        open={dialog?.type === 'edit-task'}
        title="Редагувати задачу"
      >
        {dialog?.type === 'edit-task' ? (
          <TaskForm
            checklistName={checklist.name}
            initialValues={{
              cadence: dialog.task.cadence,
              title: dialog.task.title,
              weekdays: dialog.task.weekdays,
            }}
            onSubmit={submitTaskEdit}
            submitLabel="Зберегти"
          />
        ) : null}
      </Sheet>

      <Sheet
        description="Задача зникне з розділу «Сьогодні». Історія виконань збережеться, але відновити її в цьому інтерфейсі не можна."
        onClose={closeDialog}
        triggerRef={dialogTriggerRef}
        open={dialog?.type === 'delete-task'}
        title="Видалити задачу?"
      >
        {deleteError ? (
          <Alert aria-live="polite" color="error">
            {deleteError}
          </Alert>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button className="btn-block" onClick={closeDialog} variant="ghost">
            Скасувати
          </Button>
          <Button
            className="btn-block"
            color="error"
            loading={deleting || deleteTaskMutation.isPending}
            onClick={() => void confirmDeleteTask()}
          >
            Видалити
          </Button>
        </div>
      </Sheet>
    </Page>
  );
}
