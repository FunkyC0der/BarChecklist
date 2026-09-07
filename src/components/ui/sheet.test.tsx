import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { Sheet } from './sheet';

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

describe('Sheet', () => {
  it('uses native backdrop and close behavior without an explicit X control', () => {
    const onClose = vi.fn();

    render(
      <Sheet onClose={onClose} open title="Тест">
        <p>body</p>
      </Sheet>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Тест' });
    expect(dialog.querySelector('svg')).not.toBeInTheDocument();
    expect(dialog.querySelector('form.modal-backdrop')).toHaveAttribute(
      'method',
      'dialog',
    );

    fireEvent(dialog, new Event('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders a stronger visible heading', () => {
    render(
      <Sheet onClose={vi.fn()} open title="Нова задача">
        <input aria-label="Назва задачі" />
      </Sheet>,
    );

    expect(screen.getByRole('heading', { name: 'Нова задача' })).toHaveClass(
      'text-2xl',
      'font-bold',
      'tracking-tight',
    );
  });
});
