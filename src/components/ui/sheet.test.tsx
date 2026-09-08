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

import { useRef, useState } from 'react';

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

function getSurface(dialog: HTMLElement) {
  const surface = dialog.closest<HTMLElement>('.modal');
  if (!surface) throw new Error('Sheet surface was not rendered');
  return surface;
}

describe('Sheet', () => {
  it('uses Base UI backdrop and close behavior without an explicit X control', () => {
    const onClose = vi.fn();

    render(
      <Sheet onClose={onClose} open title="Тест">
        <p>body</p>
      </Sheet>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Тест' });
    expect(dialog.querySelector('svg')).not.toBeInTheDocument();
    expect(dialog.querySelector('button.sr-only')).toHaveTextContent('Закрити');
    expect(
      getSurface(dialog).querySelector('.modal-backdrop'),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
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
      '[--sheet-bottom-clearance:calc(max(var(--bottom-popup-gap),env(safe-area-inset-bottom))+var(--bottom-dock-height)+var(--bottom-popup-gap))]',
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
  });

  it('follows the visual viewport via a keyboard-inset transform on resize and scroll', () => {
    const viewport = installViewport();
    render(
      <Sheet onClose={vi.fn()} open title="Нова задача">
        <input aria-label="Назва задачі" />
      </Sheet>,
    );

    const dialog = screen.getByRole('dialog');
    const surface = getSurface(dialog);
    nextFrame();
    expect(surface.style.getPropertyValue('--sheet-keyboard-inset')).toBe(
      '0px',
    );
    expect(surface.style.getPropertyValue('--sheet-viewport-height')).toBe(
      '700px',
    );

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

    viewport.offsetTop = 90;
    viewport.dispatchEvent(new Event('scroll'));
    nextFrame();
    // 700 - (90 + 320) = 290
    expect(surface.style.getPropertyValue('--sheet-keyboard-inset')).toBe(
      '290px',
    );

    viewport.height = 700;
    viewport.offsetTop = 0;
    viewport.dispatchEvent(new Event('resize'));
    nextFrame();
    expect(surface.style.getPropertyValue('--sheet-keyboard-inset')).toBe(
      '0px',
    );
    expect(surface.style.getPropertyValue('--sheet-bottom-clearance')).toBe('');
  });

  it('smooths keyboard resizes while tracking viewport pans live', () => {
    const viewport = installViewport();
    render(
      <Sheet onClose={vi.fn()} open title="Нова задача">
        <input aria-label="Назва задачі" />
      </Sheet>,
    );

    const surface = getSurface(screen.getByRole('dialog'));
    nextFrame();
    expect(surface.dataset.sheetTracking).toBe('live');

    // A keyboard-sized resize is the jump worth animating.
    viewport.height = 320;
    viewport.dispatchEvent(new Event('resize'));
    nextFrame();
    expect(surface.dataset.sheetTracking).toBeUndefined();

    // Safari pans right behind that resize: stay animated, or the still
    // running transition gets cut to its target mid-flight.
    viewport.offsetTop = 20;
    viewport.dispatchEvent(new Event('scroll'));
    nextFrame();
    expect(surface.dataset.sheetTracking).toBeUndefined();

    // Once the transition has settled, panning tracks the viewport 1:1 again.
    act(() => vi.advanceTimersByTime(300));
    viewport.offsetTop = 60;
    viewport.dispatchEvent(new Event('scroll'));
    nextFrame();
    expect(surface.dataset.sheetTracking).toBe('live');

    // Jitter below the delta threshold is not worth a transition either.
    viewport.height = 330;
    viewport.dispatchEvent(new Event('resize'));
    nextFrame();
    expect(surface.dataset.sheetTracking).toBe('live');
  });

  it('corrects revealFocusedEditor scroll math for the pending transform shift', () => {
    const viewport = installViewport();
    render(
      <Sheet onClose={vi.fn()} open title="Нова задача">
        <input aria-label="Назва задачі" />
      </Sheet>,
    );
    const box = screen.getByRole<HTMLElement>('dialog');
    const editor = screen.getByRole('textbox');
    // Both rects are pinned to their pre-transition ("stale") geometry: a
    // real device's getBoundingClientRect() still reports this in the same
    // tick a 'resize' launches the keyboard-inset transition.
    mockScrollArea(
      box,
      () => 0,
      () => 700,
    );
    mockEditorPosition(editor, () => 500);
    act(() => editor.focus());
    nextFrame();
    expect(box.scrollTop).toBe(0);

    viewport.height = 320;
    viewport.offsetTop = 0;
    viewport.dispatchEvent(new Event('resize'));
    nextFrame();

    // keyboardInset = 700 - (0 + 320) = 380, so pendingShift = 380. The
    // field's stale rect (bottom 544) sits well past the new clip window
    // (bottom 308), but corrected for the pending shift (544 - 380 = 164) it
    // already fits — an implementation that ignored pendingShift would
    // scroll it unnecessarily.
    expect(box.scrollTop).toBe(0);
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

      const box = screen.getByRole<HTMLElement>('dialog');
      const editor = screen.getByRole('textbox');
      // The box sits bottom-anchored inside the (always full-height, locally
      // unshifted) surface: its local top is `layoutHeight - ownHeight`.
      // `paintedInset` mirrors what the surface's transform currently shows
      // on screen — it lags behind the target during an animated update,
      // exactly like a real element's rect would mid-transition.
      const layoutHeight = 700;
      const insetFor = (offsetTop: number, height: number) =>
        Math.max(0, layoutHeight - (offsetTop + height));
      let paintedInset = 0;
      const boxTopRaw = () => layoutHeight - viewport.height - paintedInset;
      mockScrollArea(box, boxTopRaw, () => viewport.height);
      let nativeFocusPan = 0;
      mockEditorPosition(
        editor,
        () => boxTopRaw() + 550 + nativeFocusPan - box.scrollTop,
      );
      act(() => editor.focus());
      nextFrame();
      expect(box.scrollTop).toBe(0);

      // Focus happens before iOS reports the smaller keyboard viewport: the
      // resize below launches an animated transition, so the mocked rect
      // stays at its pre-resize position for this one frame — pendingShift
      // must correct for that to compute the right scroll.
      viewport.height = 320;
      viewport.offsetTop = 60;
      viewport.dispatchEvent(new Event('resize'));
      nextFrame();
      expect(box.scrollTop).toBeGreaterThan(0);
      // Settle the transition before checking against the target window.
      paintedInset = insetFor(viewport.offsetTop, viewport.height);
      expect(editor.getBoundingClientRect().bottom).toBeLessThanOrEqual(368);
      expect(editor.getBoundingClientRect().top).toBeGreaterThanOrEqual(72);

      // A later Safari pan must remeasure even if height did not change.
      // Its delta is small enough to track live (no correction needed), so
      // the surface is already visually settled by the time it fires.
      nativeFocusPan = 45;
      viewport.offsetTop = 90;
      paintedInset = insetFor(viewport.offsetTop, viewport.height);
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
    const box = screen.getByRole<HTMLElement>('dialog');
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
    const box = screen.getByRole<HTMLElement>('dialog');
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
    const surface = getSurface(dialog);
    nextFrame();
    viewport.dispatchEvent(new Event('resize'));
    rerender(
      <Sheet onClose={vi.fn()} open={false} title="Нова задача">
        <input aria-label="Назва задачі" />
      </Sheet>,
    );
    nextFrame();
    expect(surface.style.getPropertyValue('--sheet-keyboard-inset')).toBe('');
    expect(surface.style.getPropertyValue('--sheet-viewport-height')).toBe('');
    expect(surface.style.getPropertyValue('--sheet-bottom-clearance')).toBe('');
    expect(surface.dataset.sheetTracking).toBeUndefined();
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
    const box = dialog;
    const surface = getSurface(dialog);
    const editor = screen.getByRole('textbox');
    act(() => editor.focus());
    nextFrame();
    expect(editor).toHaveFocus();
    expect(surface.style.getPropertyValue('--sheet-keyboard-inset')).toBe('');
    expect(surface.style.getPropertyValue('--sheet-viewport-height')).toBe('');
    expect(box.scrollTop).toBe(0);
    expect(box).toHaveClass(
      'max-h-[calc(var(--sheet-viewport-height,100dvh)-var(--sheet-bottom-clearance))]',
      'overflow-y-auto',
    );
  });

  it('opens from a real trigger button click and restores focus to the trigger on close', async () => {
    function TriggeredSheet() {
      const [open, setOpen] = useState(false);
      const triggerRef = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button
            onClick={(event) => {
              triggerRef.current = event.currentTarget;
              setOpen(true);
            }}
            ref={triggerRef}
            type="button"
          >
            Відкрити Sheet
          </button>
          <Sheet
            onClose={() => setOpen(false)}
            open={open}
            title="Помити посуд"
            triggerRef={triggerRef}
          >
            <p>Контент sheet</p>
          </Sheet>
        </>
      );
    }

    render(<TriggeredSheet />);

    const trigger = screen.getByRole('button', { name: 'Відкрити Sheet' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Deliberately do NOT call trigger.focus() here: a real pointer click
    // must be what opens the Sheet. Safari/Firefox don't focus buttons on
    // click by default, so `document.activeElement` stays on `<body>` —
    // this asserts that Sheet restores focus via the explicit `triggerRef`
    // it was given (base UI's `finalFocus`), not via relying on the browser
    // having focused the trigger.
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    nextFrame();

    const dialog = screen.getByRole('dialog', { name: 'Помити посуд' });
    expect(dialog).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    nextFrame();
    // Base UI restores focus from a `queueMicrotask` scheduled by the
    // dialog's unmount cleanup; flush the real microtask queue (fake timers
    // don't touch it) before asserting.
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('dismisses when the backdrop is pressed', () => {
    const onClose = vi.fn();

    render(
      <Sheet onClose={onClose} open title="Помити посуд">
        <p>Контент sheet</p>
      </Sheet>,
    );

    nextFrame();

    const dialog = screen.getByRole('dialog', { name: 'Помити посуд' });
    const backdrop =
      getSurface(dialog).parentElement?.querySelector('.modal-backdrop');
    if (!backdrop) throw new Error('Sheet backdrop was not rendered');

    // Base UI treats outside-press as "intentional" whenever a backdrop
    // element is present: it only commits the dismissal on `click`, but
    // gates that on having also observed a real `pointerdown` press first
    // (so a programmatic `.click()` without a preceding press is ignored).
    // Reproduce the full real-world press-then-click sequence.
    fireEvent.pointerDown(backdrop);
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
