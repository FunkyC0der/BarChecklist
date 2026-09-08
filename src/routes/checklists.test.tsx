import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import { renderWithRouter } from '@/test/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { ToastProvider } from '@/components/ui';

const api = vi.hoisted(() => ({
  createChecklist: vi.fn(),
  fetchActiveTaskCounts: vi.fn(),
  fetchChecklists: vi.fn(),
}));
const teamState = vi.hoisted(() => ({
  activeTeam: {
    id: 'team-1',
    owner_id: 'owner-1',
  } as { id: string; owner_id: string } | null,
  status: 'ready' as 'error' | 'idle' | 'loading' | 'ready',
}));

vi.mock('@/features/checklists/checklist-api', () => ({
  ...api,
}));
vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ session: { user: { id: 'owner-1' } } }),
}));
vi.mock('@/features/teams/team-context', () => ({
  useTeams: () => teamState,
}));

import { ChecklistsRoute } from './checklists';

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderRoute() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderWithRouter({
    additionalRoutes: [
      {
        component: () => <div>Нова сторінка чекліста</div>,
        path: '/checklists/$checklistId',
      },
    ],
    component: () => (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ChecklistsRoute />
        </ToastProvider>
      </QueryClientProvider>
    ),
    initialPath: '/checklists',
    path: '/checklists',
  });
}

describe('ChecklistsRoute', () => {
  beforeEach(() => {
    api.createChecklist.mockReset();
    api.fetchActiveTaskCounts.mockReset();
    api.fetchChecklists.mockReset();
    api.fetchActiveTaskCounts.mockResolvedValue(new Map());
    api.fetchChecklists.mockResolvedValue([]);
    teamState.activeTeam = { id: 'team-1', owner_id: 'owner-1' };
    teamState.status = 'ready';
  });

  it('opens a newly created checklist immediately', async () => {
    api.createChecklist.mockResolvedValue({ id: 'checklist-new' });
    renderRoute();

    await screen.findByRole('heading', { name: 'Чеклістів поки немає' });
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Створити чекліст' })[0]!,
    );
    fireEvent.change(screen.getByLabelText('Назва чекліста'), {
      target: { value: 'Відкриття зміни' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Створити' }));

    expect(
      await screen.findByText('Нова сторінка чекліста'),
    ).toBeInTheDocument();
    expect(api.createChecklist).toHaveBeenCalledWith({
      createdBy: 'owner-1',
      name: 'Відкриття зміни',
      teamId: 'team-1',
    });
  });

  it('restores focus to the checklist creation trigger after the Sheet closes', async () => {
    renderRoute();

    await screen.findByRole('heading', { name: 'Чеклістів поки немає' });
    const trigger = screen.getAllByRole('button', {
      name: 'Створити чекліст',
    })[0]!;
    fireEvent.click(trigger);
    expect(
      await screen.findByRole('dialog', { name: 'Новий чекліст' }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps the actual name input above the keyboard after the + opens a short checklist sheet', async () => {
    const viewport = Object.assign(new EventTarget(), {
      height: 700,
      offsetTop: 0,
    });
    vi.stubGlobal('visualViewport', viewport);
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id);
    });
    const nextFrame = () => {
      act(() => {
        const callbacks = [...frames.values()];
        frames.clear();
        callbacks.forEach((callback) => callback(performance.now()));
      });
    };

    renderRoute();
    await screen.findByRole('heading', { name: 'Чеклістів поки немає' });
    const addButton = screen
      .getAllByRole('button', { name: 'Створити чекліст' })
      .find((button) => button.closest('.fab'))!;
    expect(addButton).toHaveAttribute('type', 'button');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(addButton);

    const dialog = screen.getByRole('dialog', { name: 'Новий чекліст' });
    const box = dialog;
    const surface = dialog.closest<HTMLElement>('.modal');
    if (!surface) throw new Error('Checklist sheet surface was not rendered');
    const editor = screen.getByRole('textbox', { name: 'Назва чекліста' });
    expect(box).toContainElement(editor);
    expect(editor).toHaveFocus();

    // jsdom has no layout. Model the floating bottom-aligned dialog grid: a short box ends
    // at the dialog's bottom, and has no scroll range. A box-height cap alone
    // therefore cannot reveal this field; the surface's keyboard-inset
    // transform must move it too. jsdom's default innerHeight (768, never
    // stubbed here) is the fixed layout height the inset is measured against.
    const layoutHeight = 768;
    const keyboardInset = () =>
      Number.parseFloat(
        surface.style.getPropertyValue('--sheet-keyboard-inset'),
      ) || 0;
    const boxTop = () => layoutHeight - keyboardInset() - 220;
    Object.defineProperties(box, {
      clientHeight: { configurable: true, value: 220 },
      scrollHeight: { configurable: true, value: 220 },
    });
    vi.spyOn(box, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, boxTop(), 390, 220),
    );
    vi.spyOn(editor, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(16, boxTop() + 84 - box.scrollTop, 358, 44),
    );
    const expectVisibleEditor = () => {
      expect(editor.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        viewport.offsetTop,
      );
      expect(editor.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        viewport.offsetTop + viewport.height,
      );
      expect(editor).toHaveFocus();
    };

    nextFrame();
    expectVisibleEditor();

    viewport.height = 320;
    viewport.offsetTop = 60;
    viewport.dispatchEvent(new Event('resize'));
    expect(editor.getBoundingClientRect().bottom).toBeGreaterThan(
      viewport.offsetTop + viewport.height,
    );
    nextFrame();
    expectVisibleEditor();

    // Safari can pan after reporting keyboard height, then resize once more.
    viewport.offsetTop = 100;
    viewport.dispatchEvent(new Event('scroll'));
    nextFrame();
    expectVisibleEditor();
    viewport.height = 280;
    viewport.dispatchEvent(new Event('resize'));
    nextFrame();
    expectVisibleEditor();
    expect(box.scrollTop).toBe(0);

    fireEvent.change(editor, { target: { value: 'Відкриття бару' } });
    expect(editor).toHaveValue('Відкриття бару');
    expectVisibleEditor();
  });

  it('shows a Team CTA instead of loading forever without membership', async () => {
    teamState.activeTeam = null;
    renderRoute();

    expect(
      await screen.findByRole('heading', { name: 'Команди ще немає' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Створити команду' }),
    ).toHaveAttribute('href', '/team');
    await waitFor(() => expect(api.fetchChecklists).not.toHaveBeenCalled());
  });
});
