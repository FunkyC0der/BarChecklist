import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type Task } from './checklist-api';
import { applyReorder } from './sortable-task-order';

vi.hoisted(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
});

// Real @dnd-kit pointer drags aren't worth simulating for the in-flight
// reorder guard test below: capture the DragDropProvider's onDragEnd so the
// test can invoke it directly, and let `move` just return whatever next
// order the synthetic event carries.
const dragCapture = vi.hoisted(
  () =>
    ({ onDragEnd: null }) as { onDragEnd: ((event: unknown) => void) | null },
);

vi.mock('@dnd-kit/helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/helpers')>();
  return {
    ...actual,
    move: (_ids: string[], event: { next: string[] }) => event.next,
  };
});

vi.mock('@dnd-kit/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/react')>();
  return {
    ...actual,
    DragDropProvider: ({
      children,
      onDragEnd,
    }: {
      children: ReactNode;
      onDragEnd: (event: unknown) => void;
    }) => {
      dragCapture.onDragEnd = onDragEnd;
      return children;
    },
  };
});

import { SortableTaskList } from './sortable-task-list';

const tasks: Task[] = [
  {
    cadence: 'daily',
    checklist_id: 'checklist-1',
    created_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    id: 'task-1',
    position: 0,
    title: 'Перша задача',
    updated_at: '2026-01-01T00:00:00Z',
    weekdays: [],
  },
  {
    cadence: 'weekly',
    checklist_id: 'checklist-1',
    created_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    id: 'task-2',
    position: 1,
    title: 'Друга задача',
    updated_at: '2026-01-01T00:00:00Z',
    weekdays: [1, 3],
  },
];

describe('applyReorder', () => {
  it('moves an item from one index to another', () => {
    expect(applyReorder(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });
});

describe('SortableTaskList', () => {
  it('renders task rows', () => {
    render(
      <SortableTaskList
        canManage
        onReorder={vi.fn().mockResolvedValue(undefined)}
        onSelect={vi.fn()}
        tasks={tasks}
      />,
    );

    expect(screen.getByText('Перша задача')).toBeInTheDocument();
    expect(screen.getByText('Друга задача')).toBeInTheDocument();
  });

  it('does not render a separate drag button for members', () => {
    render(
      <SortableTaskList
        canManage={false}
        onReorder={vi.fn().mockResolvedValue(undefined)}
        tasks={tasks}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Перемістити «Перша задача»' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Перемістити «Друга задача»' }),
    ).not.toBeInTheDocument();
  });

  it('does not render a separate drag button for owners', () => {
    render(
      <SortableTaskList
        canManage
        onReorder={vi.fn().mockResolvedValue(undefined)}
        onSelect={vi.fn()}
        tasks={tasks}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Перемістити «Перша задача»' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Перемістити «Друга задача»' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Перша задача/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Друга задача/ }),
    ).toBeInTheDocument();
  });

  it('ignores a second drag while the first reorder is still in flight (P2-1)', async () => {
    let resolveFirst: (() => void) | undefined;
    const onReorder = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue(undefined);

    render(<SortableTaskList canManage onReorder={onReorder} tasks={tasks} />);

    // `dragCapture.onDragEnd` is reassigned on every SortableTaskList
    // render (its closure captures the current orderedTasks/ref state), so
    // each drag reads it fresh rather than caching a single reference.
    expect(dragCapture.onDragEnd).not.toBeNull();

    // Drag 1: task-1 <-> task-2.
    await act(async () => {
      dragCapture.onDragEnd!({ canceled: false, next: ['task-2', 'task-1'] });
    });
    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith(['task-2', 'task-1']);

    // Drag 2 starts before drag 1 has settled: it must be ignored rather
    // than firing a second, concurrent reorder RPC.
    await act(async () => {
      dragCapture.onDragEnd!({ canceled: false, next: ['task-1', 'task-2'] });
    });
    expect(onReorder).toHaveBeenCalledTimes(1);

    // Once drag 1 settles, the guard lifts and a new drag is honored.
    await act(async () => {
      resolveFirst?.();
    });
    await act(async () => {
      dragCapture.onDragEnd!({ canceled: false, next: ['task-1', 'task-2'] });
    });
    expect(onReorder).toHaveBeenCalledTimes(2);
  });
});
