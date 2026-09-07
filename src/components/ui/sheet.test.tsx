import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { ChecklistForm } from '@/features/checklists/checklist-form';
import { TaskForm } from '@/features/checklists/task-form';

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

function mockScrollArea(
  element: HTMLElement,
  top: () => number,
  height: () => number,
  scrollHeight = 1000,
) {
  Object.defineProperties(element, {
    clientHeight: { configurable: true, get: height },
    scrollHeight: { configurable: true, value: scrollHeight },
  });
  vi.spyOn(element, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(0, top(), 300, height()),
  );
}

function mockEditorPosition(editor: HTMLElement, top: () => number) {
  vi.spyOn(editor, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(0, top(), 240, 44),
  );
}

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

  it('uses one floating, scrollable card contract above the dock', () => {
    render(
      <Sheet onClose={vi.fn()} open title="Нова задача">
        <div className="h-[1200px]">Довгий вміст</div>
      </Sheet>,
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
      '[--sheet-bottom-clearance:calc(max(var(--bottom-popup-gap),env(safe-area-inset-bottom))+var(--bottom-dock-height)+var(--bottom-popup-gap))]',
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
  });

  it('moves the dialog bottom anchor with viewport resize and scroll', () => {
    const viewport = installViewport();
    render(
      <Sheet onClose={vi.fn()} open title="Нова задача">
        <input aria-label="Назва задачі" />
      </Sheet>,
    );

    const dialog = screen.getByRole('dialog');
    const sheet = dialog.querySelector<HTMLElement>('.modal-box')!;
    nextFrame();
    expect(dialog).toHaveStyle({ top: '0px', height: '700px', bottom: 'auto' });
    expect(sheet.style.maxHeight).toBe('');

    viewport.height = 320;
    viewport.offsetTop = 60;
    viewport.dispatchEvent(new Event('resize'));
    nextFrame();
    expect(dialog).toHaveStyle({
      top: '60px',
      height: '320px',
      bottom: 'auto',
    });
    expect(dialog.style.getPropertyValue('--sheet-bottom-clearance')).toBe(
      '12px',
    );
    expect(sheet).toHaveStyle({ maxHeight: '308px' });

    viewport.offsetTop = 90;
    viewport.dispatchEvent(new Event('scroll'));
    nextFrame();
    expect(dialog).toHaveStyle({ top: '90px', height: '320px' });

    viewport.height = 700;
    viewport.offsetTop = 0;
    viewport.dispatchEvent(new Event('resize'));
    nextFrame();
    expect(dialog.style.getPropertyValue('--sheet-bottom-clearance')).toBe('');
    expect(sheet.style.maxHeight).toBe('');
  });

  it.each(['checklist', 'task'] as const)(
    'reveals the focused %s title after keyboard resize and later viewport pan',
    (form) => {
      const viewport = installViewport();
      render(
        <Sheet onClose={vi.fn()} open title="Створити">
          {form === 'checklist' ? (
            <ChecklistForm onSubmit={vi.fn()} submitLabel="Створити" />
          ) : (
            <TaskForm
              checklistName="Бар"
              onSubmit={vi.fn()}
              submitLabel="Створити"
            />
          )}
        </Sheet>,
      );

      const box = screen
        .getByRole('dialog')
        .querySelector<HTMLElement>('.modal-box')!;
      const editor = screen.getByRole('textbox');
      mockScrollArea(
        box,
        () => viewport.offsetTop,
        () => viewport.height,
      );
      let nativeFocusPan = 0;
      mockEditorPosition(
        editor,
        () => viewport.offsetTop + 550 + nativeFocusPan - box.scrollTop,
      );
      act(() => editor.focus());
      nextFrame();
      expect(box.scrollTop).toBe(0);

      // Focus happens before iOS reports the smaller keyboard viewport.
      viewport.height = 320;
      viewport.offsetTop = 60;
      viewport.dispatchEvent(new Event('resize'));
      nextFrame();
      expect(box.scrollTop).toBeGreaterThan(0);
      expect(editor.getBoundingClientRect().bottom).toBeLessThanOrEqual(368);
      expect(editor.getBoundingClientRect().top).toBeGreaterThanOrEqual(72);

      // A later Safari pan must remeasure even if height did not change.
      nativeFocusPan = 45;
      viewport.offsetTop = 90;
      viewport.dispatchEvent(new Event('scroll'));
      nextFrame();
      expect(editor.getBoundingClientRect().bottom).toBeLessThanOrEqual(398);
      expect(editor.getBoundingClientRect().top).toBeGreaterThanOrEqual(102);
      expect(editor).toHaveFocus();
    },
  );

  it('reveals a newly focused field in nested scroll areas without scrolling the page', () => {
    const viewport = installViewport();
    viewport.height = 320;
    viewport.offsetTop = 40;
    const scrollPage = vi.spyOn(window, 'scrollTo');
    render(
      <Sheet onClose={vi.fn()} open title="Поля">
        <input aria-label="Перше" />
        <div data-testid="nested" style={{ overflowY: 'auto' }}>
          <textarea aria-label="Друге" />
        </div>
      </Sheet>,
    );
    const box = screen
      .getByRole('dialog')
      .querySelector<HTMLElement>('.modal-box')!;
    const nested = screen.getByTestId('nested');
    const first = screen.getByRole('textbox', { name: 'Перше' });
    const second = screen.getByRole('textbox', { name: 'Друге' });
    mockScrollArea(
      box,
      () => viewport.offsetTop,
      () => viewport.height,
    );
    mockScrollArea(
      nested,
      () => 500 - box.scrollTop,
      () => 180,
      600,
    );
    mockEditorPosition(first, () => 80 - box.scrollTop);
    mockEditorPosition(second, () => 900 - box.scrollTop - nested.scrollTop);

    act(() => first.focus());
    nextFrame();
    expect(box.scrollTop).toBe(0);

    act(() => second.focus());
    nextFrame();
    expect(nested.scrollTop).toBeGreaterThan(0);
    expect(box.scrollTop).toBeGreaterThan(0);
    expect(second.getBoundingClientRect().top).toBeGreaterThanOrEqual(52);
    expect(second.getBoundingClientRect().bottom).toBeLessThanOrEqual(348);
    expect(scrollPage).not.toHaveBeenCalled();

    act(() => first.focus());
    nextFrame();
    expect(first.getBoundingClientRect().top).toBeGreaterThanOrEqual(52);
    expect(first).toHaveFocus();
  });

  it('checks visibility again when the sheet opening transition finishes', () => {
    const viewport = installViewport();
    viewport.height = 320;
    render(
      <Sheet onClose={vi.fn()} open title="Нова задача">
        <input aria-label="Назва задачі" />
      </Sheet>,
    );
    const box = screen
      .getByRole('dialog')
      .querySelector<HTMLElement>('.modal-box')!;
    const editor = screen.getByRole('textbox');
    mockScrollArea(
      box,
      () => 0,
      () => viewport.height,
    );
    let fieldTop = 100;
    mockEditorPosition(editor, () => fieldTop - box.scrollTop);
    act(() => editor.focus());
    nextFrame();
    expect(box.scrollTop).toBe(0);

    fieldTop = 400;
    fireEvent.transitionEnd(box);
    nextFrame();
    expect(editor.getBoundingClientRect().bottom).toBeLessThanOrEqual(308);
  });

  it('removes viewport listeners, pending frames, and overrides when closed', () => {
    const viewport = installViewport();
    const removeListener = vi.spyOn(viewport, 'removeEventListener');
    const { rerender, unmount } = render(
      <Sheet onClose={vi.fn()} open title="Нова задача">
        <input aria-label="Назва задачі" />
      </Sheet>,
    );
    const dialog = screen.getByRole('dialog');
    const box = dialog.querySelector('.modal-box');
    nextFrame();
    viewport.dispatchEvent(new Event('resize'));
    rerender(
      <Sheet onClose={vi.fn()} open={false} title="Нова задача">
        <input aria-label="Назва задачі" />
      </Sheet>,
    );
    nextFrame();
    expect(dialog.style.height).toBe('');
    expect(dialog.style.top).toBe('');
    expect(dialog.style.getPropertyValue('--sheet-bottom-clearance')).toBe('');
    expect(box).not.toHaveAttribute(
      'style',
      expect.stringContaining('max-height'),
    );
    expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });

  it('preserves native layout and focus behavior without visualViewport', () => {
    render(
      <Sheet onClose={vi.fn()} open title="Нова задача">
        <input aria-label="Назва задачі" />
      </Sheet>,
    );
    const dialog = screen.getByRole('dialog');
    const box = dialog.querySelector<HTMLElement>('.modal-box')!;
    const editor = screen.getByRole('textbox');
    act(() => editor.focus());
    nextFrame();
    expect(editor).toHaveFocus();
    expect(dialog).not.toHaveAttribute('style');
    expect(box).not.toHaveAttribute('style');
    expect(box.scrollTop).toBe(0);
    expect(box).toHaveClass(
      'max-h-[calc(100dvh-var(--sheet-bottom-clearance))]',
      'overflow-y-auto',
    );
  });
});
