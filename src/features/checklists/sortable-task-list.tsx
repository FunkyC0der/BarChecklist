import { move } from '@dnd-kit/helpers';
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useState } from 'react';

import { Icon } from '@/components/ui/icon';
import { TaskMarker } from '@/components/ui/list-row';
import { cn } from '@/lib/cn';

import { type Task } from './checklist-api';
import { formatTaskSchedule } from './checklist-schedule';

function SortableTaskRow({
  index,
  isOwner,
  onSelect,
  task,
}: {
  index: number;
  isOwner: boolean;
  onSelect?: ((task: Task) => void) | undefined;
  task: Task;
}) {
  const { handleRef, isDragging, ref } = useSortable({
    disabled: !isOwner,
    id: task.id,
    index,
  });

  const titleContent = (
    <>
      <div className="text-base">{task.title}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-sm text-base-content/60">
        <Icon className="size-4" name="calendar" />
        {formatTaskSchedule(task)}
        <Icon className="size-4" name="repeat" />
      </div>
    </>
  );

  return (
    <li
      className={cn(
        'list-row min-h-14 items-start px-0',
        isDragging && 'rounded-box bg-base-200 shadow-lg',
      )}
      ref={ref}
    >
      <TaskMarker />
      {isOwner && onSelect ? (
        <button
          className="text-start list-col-grow"
          onClick={() => onSelect(task)}
          type="button"
        >
          {titleContent}
        </button>
      ) : (
        <div className="list-col-grow">{titleContent}</div>
      )}
      {isOwner ? (
        <button
          aria-label={`Перемістити «${task.title}»`}
          className="btn -my-1 btn-circle touch-none btn-ghost"
          ref={handleRef}
          type="button"
        >
          <Icon name="grip-vertical" />
        </button>
      ) : null}
    </li>
  );
}

export function SortableTaskList({
  isOwner,
  onReorder,
  onSelect,
  tasks,
}: {
  isOwner: boolean;
  onReorder: (ids: string[]) => Promise<void>;
  onSelect?: ((task: Task) => void) | undefined;
  tasks: Task[];
}) {
  const [orderedTasks, setOrderedTasks] = useState(tasks);
  const [announcement, setAnnouncement] = useState('');
  const taskKey = tasks.map((task) => task.id).join(',');
  const [lastTaskKey, setLastTaskKey] = useState(taskKey);

  if (taskKey !== lastTaskKey) {
    setLastTaskKey(taskKey);
    setOrderedTasks(tasks);
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (event.canceled) return;

    const currentIds = orderedTasks.map((task) => task.id);
    const nextIds = move(currentIds, event);

    if (nextIds.join() === currentIds.join()) return;

    const previousTasks = orderedTasks;
    const taskMap = new Map(orderedTasks.map((task) => [task.id, task]));
    const nextTasks = nextIds
      .map((id) => taskMap.get(String(id)))
      .filter((task): task is Task => task !== undefined);

    setOrderedTasks(nextTasks);

    try {
      await onReorder(nextIds.map(String));
      setAnnouncement('Порядок збережено');
    } catch {
      setOrderedTasks(previousTasks);
      setAnnouncement('Не вдалося змінити порядок');
    }
  };

  return (
    <DragDropProvider onDragEnd={(event) => void handleDragEnd(event)}>
      <ul className="list">
        {orderedTasks.map((task, index) => (
          <SortableTaskRow
            index={index}
            isOwner={isOwner}
            key={task.id}
            onSelect={onSelect}
            task={task}
          />
        ))}
      </ul>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </DragDropProvider>
  );
}
