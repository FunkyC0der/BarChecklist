import { act, fireEvent, render, screen } from '@testing-library/react';
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

  it('updates its max height when the visual viewport is resized', () => {
    let resizeHandler: (() => void) | undefined;
    const addEventListener = vi.fn((_: string, handler: () => void) => {
      resizeHandler = handler;
    });
    const removeEventListener = vi.fn();
    let viewportHeight = 700;
    const visualViewport = {
      get height() {
        return viewportHeight;
      },
      addEventListener,
      removeEventListener,
    } as unknown as VisualViewport;
    vi.stubGlobal('visualViewport', visualViewport);

    const { unmount } = render(
      <Sheet onClose={vi.fn()} open title="Нова задача">
        <input aria-label="Назва задачі" />
      </Sheet>,
    );

    const sheet = screen.getByRole('dialog').querySelector('.modal-box');
    expect(sheet).toHaveStyle({ maxHeight: 'min(90dvh, 700px)' });

    viewportHeight = 320;
    act(() => resizeHandler?.());
    expect(sheet).toHaveStyle({ maxHeight: 'min(90dvh, 320px)' });

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith('resize', resizeHandler);
    vi.unstubAllGlobals();
  });
});
