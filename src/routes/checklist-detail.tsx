import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

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
  type Checklist,
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
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isOwner = Boolean(
    activeTeam && session?.user.id === activeTeam.owner_id,
  );
  const atTaskLimit = tasks.length >= MAX_ACTIVE_TASKS_PER_CHECKLIST;

  const loadDetail = useCallback(async () => {
    if (!activeTeam || !checklistId) return;

    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const nextChecklist = await fetchChecklist(checklistId);
      if (!nextChecklist || nextChecklist.team_id !== activeTeam.id) {
        setChecklist(null);
        setTasks([]);
        setNotFound(true);
        return;
      }

      setChecklist(nextChecklist);
      setTasks(await fetchTasks(nextChecklist.id));
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Не вдалося завантажити чекліст.'));
    } finally {
      setLoading(false);
    }
  }, [activeTeam, checklistId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDetail();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadDetail]);

  const closeDialog = () => {
    setDialog(null);
    setDeleteError(null);
  };

  const openDialog = (nextDialog: Exclude<Dialog, null>) => {
    setDeleteError(null);
    setDialog(nextDialog);
  };

  const submitChecklistEdit = async (values: ChecklistFormValues) => {
    if (!checklist) return;
    await updateChecklist(checklist.id, values);
    closeDialog();
    toast('Чекліст збережено');
    await loadDetail();
  };

  const submitTaskCreate = async (values: TaskFormValues) => {
    if (!checklist) return;
    await createTask(checklist.id, values);
    closeDialog();
    toast('Задачу додано');
    await loadDetail();
  };

  const submitTaskEdit = async (values: TaskFormValues) => {
    if (dialog?.type !== 'edit-task') return;
    await updateTask(dialog.task.id, values);
    closeDialog();
    toast('Задачу збережено');
    await loadDetail();
  };

  const confirmDeleteChecklist = async () => {
    if (!checklist) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteChecklist(checklist.id);
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
      await deleteTask(dialog.task.id);
      closeDialog();
      toast('Задачу видалено');
      await loadDetail();
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

    setError(null);
    try {
      await reorderTasks(checklist.id, ids);
      setTasks(await fetchTasks(checklist.id));
      toast('Порядок збережено');
    } catch (reorderError) {
      setError(getErrorMessage(reorderError, 'Не вдалося змінити порядок.'));
      throw reorderError;
    }
  };

  if (status === 'loading' || !activeTeam) {
    return (
      <Page back="/checklists" hideTitle title=" ">
        <Skeleton />
      </Page>
    );
  }

  if (loading) {
    return (
      <Page back="/checklists" hideTitle title=" ">
        <Skeleton />
      </Page>
    );
  }

  if (error) {
    return (
      <Page back="/checklists" title="Чекліст">
        <Alert color="error">
          <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button color="primary" size="sm" onClick={() => void loadDetail()}>
              Повторити
            </Button>
          </div>
        </Alert>
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
              onClick={() => openDialog({ type: 'edit-checklist' })}
            />
            <details className="dropdown dropdown-end">
              <summary
                aria-label="Ще"
                className="btn btn-circle list-none btn-ghost [&::-webkit-details-marker]:hidden"
              >
                <Icon name="more-horizontal" />
              </summary>
              <ul className="menu dropdown-content z-30 w-52 rounded-box bg-base-100 shadow-sm">
                <li>
                  <button
                    className="text-error"
                    onClick={(event) => {
                      event.currentTarget
                        .closest('details')
                        ?.removeAttribute('open');
                      openDialog({ type: 'delete-checklist' });
                    }}
                    type="button"
                  >
                    Видалити чекліст
                  </button>
                </li>
              </ul>
            </details>
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
      {error ? <Alert color="error">{error}</Alert> : null}

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
              ? (task) => openDialog({ task, type: 'edit-task' })
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
          onClick={() => openDialog({ type: 'create-task' })}
        />
      ) : null}

      <Sheet
        onClose={closeDialog}
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
            loading={deleting}
            onClick={() => void confirmDeleteChecklist()}
          >
            Видалити
          </Button>
        </div>
      </Sheet>

      <Sheet
        onClose={closeDialog}
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
            <details className="dropdown dropdown-end">
              <summary
                aria-label="Ще"
                className="btn btn-circle list-none btn-ghost [&::-webkit-details-marker]:hidden"
              >
                <Icon name="more-horizontal" />
              </summary>
              <ul className="menu dropdown-content z-30 w-52 rounded-box bg-base-100 shadow-sm">
                <li>
                  <button
                    className="text-error"
                    onClick={() => {
                      if (dialog?.type !== 'edit-task') return;
                      const task = dialog.task;
                      document.activeElement
                        ?.closest('details')
                        ?.removeAttribute('open');
                      closeDialog();
                      openDialog({ task, type: 'delete-task' });
                    }}
                    type="button"
                  >
                    Видалити задачу
                  </button>
                </li>
              </ul>
            </details>
          ) : undefined
        }
        onClose={closeDialog}
        open={dialog?.type === 'edit-task'}
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
            loading={deleting}
            onClick={() => void confirmDeleteTask()}
          >
            Видалити
          </Button>
        </div>
      </Sheet>
    </Page>
  );
}
