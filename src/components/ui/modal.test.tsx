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
  // The layout-height formula also reads innerHeight; jsdom's default (768)
  // would otherwise leak in as a phantom keyboard inset.
  vi.stubGlobal('innerHeight', 700);
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

function getSurface(dialog: HTMLElement) {
  const surface = dialog.closest<HTMLElement>('.modal');
  if (!surface) throw new Error('Modal surface was not rendered');
  return surface;
}

describe('Modal', () => {
  it('uses the shared floating popup card and Base UI backdrop', () => {
    render(
      <Modal onClose={vi.fn()} open title="Редагувати команду">
        <div className="h-[1200px]">Довгий вміст</div>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    const box = dialog;
    const surface = getSurface(dialog);
    expect(surface).toHaveClass('modal-open');
    expect(surface).toHaveClass(
      'modal',
      'items-end',
      'justify-items-center',
      'px-3',
      'pb-[var(--sheet-bottom-clearance)]',
      '[--bottom-dock-height:3.5rem]',
      '[--bottom-popup-gap:0.75rem]',
    );
    expect(surface).not.toHaveClass('place-items-end');
    expect(box).toHaveClass(
      'w-full',
      'max-w-xl',
      'rounded-box',
      'border',
      'border-base-300/60',
      'bg-base-100',
      'shadow-xl',
      'overflow-y-auto',
      'max-h-[calc(var(--sheet-viewport-height,100dvh)-var(--sheet-bottom-clearance))]',
    );
    expect(surface.querySelector('.modal-backdrop')).toBeInTheDocument();
    expect(dialog.querySelector('button.sr-only')).toHaveTextContent('Закрити');
  });

  it('follows the visual viewport via a keyboard-inset transform and cleans up on close', () => {
    const viewport = installViewport();
    const { rerender } = render(
      <Modal onClose={vi.fn()} open title="Редагувати команду">
        <input aria-label="Назва" />
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    const surface = getSurface(dialog);
    nextFrame();
    expect(surface.style.getPropertyValue('--sheet-bottom-clearance')).toBe('');

    viewport.height = 320;
    viewport.offsetTop = 60;
    viewport.dispatchEvent(new Event('resize'));
    nextFrame();
    // layoutHeight(700) - (offsetTop(60) + height(320)) = 320
    expect(surface.style.getPropertyValue('--sheet-keyboard-inset')).toBe(
      '320px',
    );
    expect(surface.style.getPropertyValue('--sheet-viewport-height')).toBe(
      '320px',
    );
    expect(surface.style.getPropertyValue('--sheet-bottom-clearance')).toBe(
      '12px',
    );

    rerender(
      <Modal onClose={vi.fn()} open={false} title="Редагувати команду">
        <input aria-label="Назва" />
      </Modal>,
    );
    expect(surface.style.getPropertyValue('--sheet-keyboard-inset')).toBe('');
    expect(surface.style.getPropertyValue('--sheet-viewport-height')).toBe('');
    expect(surface.style.getPropertyValue('--sheet-bottom-clearance')).toBe('');
  });

  it('keeps native layout when visualViewport is unavailable', () => {
    render(
      <Modal onClose={vi.fn()} open title="Редагувати команду">
        <input aria-label="Назва" />
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    const surface = getSurface(dialog);
    expect(surface.style.getPropertyValue('--sheet-keyboard-inset')).toBe('');
    expect(surface.style.getPropertyValue('--sheet-viewport-height')).toBe('');
  });
});
