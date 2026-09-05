import { render, screen } from '@testing-library/react';
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
        isOwner
        onReorder={vi.fn().mockResolvedValue(undefined)}
        tasks={tasks}
      />,
    );

    expect(screen.getByText('Перша задача')).toBeInTheDocument();
    expect(screen.getByText('Друга задача')).toBeInTheDocument();
  });

  it('does not render drag handles for members', () => {
    render(
      <SortableTaskList
        isOwner={false}
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

  it('renders drag handles for owners', () => {
    render(
      <SortableTaskList
        isOwner
        onReorder={vi.fn().mockResolvedValue(undefined)}
        tasks={tasks}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Перемістити «Перша задача»' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Перемістити «Друга задача»' }),
    ).toBeInTheDocument();
  });
});
