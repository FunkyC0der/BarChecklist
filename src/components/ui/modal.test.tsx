import { act, cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { Modal } from './modal';

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

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('visualViewport', undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function installViewport() {
  Object.defineProperty(document.documentElement, 'clientHeight', {
    configurable: true,
    value: 700,
  });
  const viewport = Object.assign(new EventTarget(), {
    height: 700,
    offsetTop: 0,
  });
  vi.stubGlobal('visualViewport', viewport);
  return viewport;
}

function nextFrame() {
  act(() => vi.advanceTimersToNextFrame());
}

describe('Modal', () => {
  it('uses the shared floating popup card and native backdrop', () => {
    render(
      <Modal onClose={vi.fn()} open title="Редагувати команду">
        <div className="h-[1200px]">Довгий вміст</div>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    const box = dialog.querySelector<HTMLElement>('.modal-box')!;
    expect(dialog).toHaveClass(
      'modal',
      'place-items-end',
      'px-3',
      'pb-[var(--sheet-bottom-clearance)]',
      '[--bottom-dock-height:3.5rem]',
      '[--bottom-popup-gap:0.75rem]',
    );
    expect(box).toHaveClass(
      'w-full',
      'max-w-xl',
      'rounded-box',
      'border',
      'border-base-300/60',
      'bg-base-100',
      'shadow-xl',
      'overflow-y-auto',
      'max-h-[calc(100dvh-var(--sheet-bottom-clearance))]',
    );
    expect(dialog.querySelector('form.modal-backdrop')).toHaveAttribute(
      'method',
      'dialog',
    );
  });

  it('uses a keyboard gap and cleans up viewport overrides', () => {
    const viewport = installViewport();
    const { rerender } = render(
      <Modal onClose={vi.fn()} open title="Редагувати команду">
        <input aria-label="Назва" />
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    const box = dialog.querySelector<HTMLElement>('.modal-box')!;
    nextFrame();
    expect(dialog.style.getPropertyValue('--sheet-bottom-clearance')).toBe('');

    viewport.height = 320;
    viewport.offsetTop = 60;
    viewport.dispatchEvent(new Event('resize'));
    nextFrame();
    expect(dialog).toHaveStyle({ top: '60px', height: '320px' });
    expect(dialog.style.getPropertyValue('--sheet-bottom-clearance')).toBe(
      '12px',
    );
    expect(box).toHaveStyle({ maxHeight: '308px' });

    rerender(
      <Modal onClose={vi.fn()} open={false} title="Редагувати команду">
        <input aria-label="Назва" />
      </Modal>,
    );
    expect(dialog.style.getPropertyValue('--sheet-bottom-clearance')).toBe('');
    expect(box.style.maxHeight).toBe('');
  });

  it('keeps native layout when visualViewport is unavailable', () => {
    render(
      <Modal onClose={vi.fn()} open title="Редагувати команду">
        <input aria-label="Назва" />
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    const box = dialog.querySelector<HTMLElement>('.modal-box')!;
    expect(dialog).not.toHaveAttribute('style');
    expect(box).not.toHaveAttribute('style');
  });
});
