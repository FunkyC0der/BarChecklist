import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

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
  cadenceLabel,
  formatChecklistSchedule,
} from '@/features/checklists/checklist-schedule';
import {
  MAX_ACTIVE_TASKS_PER_CHECKLIST,
  type ChecklistFormValues,
  type TaskFormValues,
} from '@/features/checklists/checklist-schema';
import { TaskForm } from '@/features/checklists/task-form';
import { moveTaskIds } from '@/features/checklists/task-order';
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
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderStatus, setReorderStatus] = useState('');

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

  const closeDialog = () => setDialog(null);

  const submitChecklistEdit = async (values: ChecklistFormValues) => {
    if (!checklist) return;
    await updateChecklist(checklist.id, values);
    closeDialog();
    await loadDetail();
  };

  const submitTaskCreate = async (values: TaskFormValues) => {
    if (!checklist) return;
    await createTask(checklist.id, values.title);
    closeDialog();
    await loadDetail();
  };

  const submitTaskEdit = async (values: TaskFormValues) => {
    if (dialog?.type !== 'edit-task') return;
    await updateTask(dialog.task.id, values.title);
    closeDialog();
    await loadDetail();
  };

  const confirmDeleteChecklist = async () => {
    if (!checklist) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteChecklist(checklist.id);
      navigate('/checklists', { replace: true });
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Не вдалося видалити чекліст.'));
      setDeleting(false);
    }
  };

  const confirmDeleteTask = async () => {
    if (dialog?.type !== 'delete-task') return;
    setDeleting(true);
    setError(null);
    try {
      await deleteTask(dialog.task.id);
      closeDialog();
      await loadDetail();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Не вдалося видалити задачу.'));
    } finally {
      setDeleting(false);
    }
  };

  const moveTask = async (index: number, direction: 'down' | 'up') => {
    if (!checklist) return;

    const nextIds = moveTaskIds(
      tasks.map((task) => task.id),
      index,
      direction,
    );
    if (nextIds.join() === tasks.map((task) => task.id).join()) return;

    setReordering(true);
    setError(null);
    try {
      await reorderTasks(checklist.id, nextIds);
      setTasks(await fetchTasks(checklist.id));
      setReorderStatus(
        direction === 'up'
          ? 'Задачу переміщено вгору.'
          : 'Задачу переміщено вниз.',
      );
    } catch (reorderError) {
      setError(getErrorMessage(reorderError, 'Не вдалося змінити порядок.'));
    } finally {
      setReordering(false);
    }
  };

  if (status === 'loading' || !activeTeam) {
    return (
      <Screen inset scroll={false}>
        <Loading label="Завантажуємо чекліст…" size="lg" />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen inset scroll={false}>
        <Loading label="Завантажуємо чекліст…" size="lg" />
      </Screen>
    );
  }

  if (notFound || !checklist) {
    return (
      <Screen inset>
        <EmptyState
          action={
            <Link className="btn" to="/checklists">
              До списку чеклістів
            </Link>
          }
          description="Його видалено або він не належить цій команді."
          title="Чекліст не знайдено"
        />
      </Screen>
    );
  }

  return (
    <Screen inset>
      <div className="flex flex-col gap-3">
        <Link className="link text-sm link-hover" to="/checklists">
          ← До чеклістів
        </Link>
        <div className="navbar min-h-0 px-0">
          <div className="navbar-start">
            <div>
              <h1 className="text-xl font-semibold">{checklist.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge className="badge-ghost">
                  {cadenceLabel(checklist.cadence)}
                </Badge>
                <AppText tone="muted" variant="caption">
                  {formatChecklistSchedule(checklist)}
                </AppText>
              </div>
            </div>
          </div>
        </div>
        {isOwner ? (
          <div className="join">
            <Button
              className="join-item"
              onClick={() => setDialog({ type: 'edit-checklist' })}
              size="sm"
            >
              Редагувати
            </Button>
            <Button
              className="join-item"
              color="error"
              onClick={() => setDialog({ type: 'delete-checklist' })}
              size="sm"
            >
              Видалити
            </Button>
          </div>
        ) : (
          <AppText tone="muted">Лише owner може змінювати структуру.</AppText>
        )}
      </div>

      {atTaskLimit && isOwner ? (
        <Alert color="warning">
          У чеклісті може бути щонайбільше {MAX_ACTIVE_TASKS_PER_CHECKLIST}{' '}
          активних задач.
        </Alert>
      ) : null}

      {error ? <Alert color="error">{error}</Alert> : null}
      <div aria-live="polite" className="sr-only">
        {reorderStatus}
      </div>

      {isOwner ? (
        <Button
          color="primary"
          disabled={atTaskLimit}
          onClick={() => setDialog({ type: 'create-task' })}
        >
          Додати задачу
        </Button>
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState
          description={
            isOwner
              ? 'Додайте першу задачу. Порядок можна змінити кнопками вгору і вниз.'
              : 'У цьому чеклісті ще немає задач.'
          }
          title="Задач поки немає"
        />
      ) : (
        <ul className="list">
          {tasks.map((task, index) => (
            <li className="list-row items-center" key={task.id}>
              <div className="list-col-grow">
                <AppText variant="label">{task.title}</AppText>
              </div>
              {isOwner ? (
                <div className="flex flex-wrap justify-end gap-1">
                  <div className="join">
                    <Button
                      aria-label={`Перемістити «${task.title}» вгору`}
                      className="join-item"
                      disabled={reordering || index === 0}
                      onClick={() => void moveTask(index, 'up')}
                      size="sm"
                    >
                      Вгору
                    </Button>
                    <Button
                      aria-label={`Перемістити «${task.title}» вниз`}
                      className="join-item"
                      disabled={reordering || index === tasks.length - 1}
                      onClick={() => void moveTask(index, 'down')}
                      size="sm"
                    >
                      Вниз
                    </Button>
                  </div>
                  <Button
                    onClick={() => setDialog({ task, type: 'edit-task' })}
                    size="sm"
                    variant="ghost"
                  >
                    Змінити
                  </Button>
                  <Button
                    color="error"
                    onClick={() => setDialog({ task, type: 'delete-task' })}
                    size="sm"
                    variant="ghost"
                  >
                    Видалити
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Modal
        onClose={closeDialog}
        open={dialog?.type === 'edit-checklist'}
        title="Редагувати чекліст"
      >
        <ChecklistForm
          initialValues={{
            cadence: checklist.cadence,
            name: checklist.name,
            weekdays: checklist.weekdays,
          }}
          onCancel={closeDialog}
          onSubmit={submitChecklistEdit}
          submitLabel="Зберегти"
        />
      </Modal>

      <Modal
        description="Чекліст зникне з розділу «Сьогодні». Історія виконань збережеться, але відновити його в цьому інтерфейсі не можна."
        onClose={closeDialog}
        open={dialog?.type === 'delete-checklist'}
        title="Видалити чекліст?"
      >
        <div className="modal-action">
          <Button onClick={closeDialog} variant="ghost">
            Скасувати
          </Button>
          <Button
            color="error"
            loading={deleting}
            onClick={() => void confirmDeleteChecklist()}
          >
            Видалити
          </Button>
        </div>
      </Modal>

      <Modal
        onClose={closeDialog}
        open={dialog?.type === 'create-task'}
        title="Нова задача"
      >
        <TaskForm
          onCancel={closeDialog}
          onSubmit={submitTaskCreate}
          submitLabel="Додати"
        />
      </Modal>

      <Modal
        onClose={closeDialog}
        open={dialog?.type === 'edit-task'}
        title="Редагувати задачу"
      >
        {dialog?.type === 'edit-task' ? (
          <TaskForm
            initialTitle={dialog.task.title}
            onCancel={closeDialog}
            onSubmit={submitTaskEdit}
            submitLabel="Зберегти"
          />
        ) : null}
      </Modal>

      <Modal
        description="Задача зникне з розділу «Сьогодні». Історія виконань збережеться, але відновити її в цьому інтерфейсі не можна."
        onClose={closeDialog}
        open={dialog?.type === 'delete-task'}
        title="Видалити задачу?"
      >
        <div className="modal-action">
          <Button onClick={closeDialog} variant="ghost">
            Скасувати
          </Button>
          <Button
            color="error"
            loading={deleting}
            onClick={() => void confirmDeleteTask()}
          >
            Видалити
          </Button>
        </div>
      </Modal>
    </Screen>
  );
}
