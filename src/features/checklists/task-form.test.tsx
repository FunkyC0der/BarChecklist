import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { TaskForm } from './task-form';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(
    this: HTMLDialogElement,
  ) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function close(
    this: HTMLDialogElement,
  ) {
    this.open = false;
  });
});

describe('TaskForm', () => {
  it('reveals weekday circles when «Щотижня» is selected', () => {
    render(
      <TaskForm
        checklistName="Чекап"
        onSubmit={vi.fn()}
        submitLabel="Додати"
      />,
    );

    expect(screen.queryByLabelText('Пн')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Щотижня'));

    expect(screen.getByLabelText('Пн')).toBeInTheDocument();
    expect(screen.getByLabelText('Нд')).toBeInTheDocument();
  });

  it('shows zod error when submitting weekly schedule with no weekdays', async () => {
    render(
      <TaskForm
        checklistName="Чекап"
        onSubmit={vi.fn()}
        submitLabel="Додати"
      />,
    );

    fireEvent.change(screen.getByLabelText('Назва задачі'), {
      target: { value: 'Помити посуд' },
    });
    fireEvent.click(screen.getByLabelText('Щотижня'));
    fireEvent.click(screen.getByRole('button', { name: 'Додати' }));

    expect(
      await screen.findByText('Оберіть щонайменше один день тижня.'),
    ).toBeInTheDocument();
  });

  it('calls onSubmit with weekdays: [1] after toggling «Пн»', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskForm
        checklistName="Чекап"
        onSubmit={onSubmit}
        submitLabel="Додати"
      />,
    );

    fireEvent.change(screen.getByLabelText('Назва задачі'), {
      target: { value: 'Помити посуд' },
    });
    fireEvent.click(screen.getByLabelText('Щотижня'));
    fireEvent.click(screen.getByLabelText('Пн'));
    fireEvent.click(screen.getByRole('button', { name: 'Додати' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        cadence: 'weekly',
        title: 'Помити посуд',
        weekdays: [1],
      });
    });
  });
});
