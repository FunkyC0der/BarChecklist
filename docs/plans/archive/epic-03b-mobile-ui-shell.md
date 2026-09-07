# Історичний запис — Епік 3b. Mobile UI shell

> Historical record only; this file is not current instruction.

Статус: `DONE` — реалізацію, quality gates і browser QA завершено 5 вересня 2026 року.

## Мета

Побудувати єдину мобільну design-систему на daisyUI 5 (тема `cupcake`) за зразком Todoist: плаваючий toolbar + великий заголовок у контенті, full-bleed списки без карток, FAB для головної дії, floating pill dock, bottom sheet з X/⋯ для редагування, chips для cadence/weekdays і drag-and-drop reorder задач.

## Залежності

- Епік 3 `DONE`: checklist і task management (CRUD, schedule, soft-delete, ліміти, deep link).
- Епік 2b `DONE`: React + Vite + Tailwind 4 + daisyUI 5.

## Зафіксовані рішення

1. Layout за зразком Todoist: sticky toolbar (back-коло + пілюля icon-кнопок), великий `text-3xl` заголовок у скрол-контенті, full-bleed `bg-base-100` без карток у AppLayout.
2. Навігація — floating pill dock (`dock dock-sm`) з іконками та підписами; активний пункт — `bg-primary text-primary-content` pill без underline.
3. Головна дія екрана — FAB `+` над dock; редагування об'єктів — bottom `Sheet` (X ліворуч, ⋯ праворуч, grab-handle).
4. Drag-and-drop reorder задач через `@dnd-kit/react` + `@dnd-kit/helpers`: touch DnD без бібліотеки ненадійний (HTML5 DnD не працює на Android Chrome); пакет включає keyboard sensor і announcements. **Рішення 4 Епіка 3 («reorder кнопками, без DnD і нових залежностей») замінено цим епіком.**
5. Touch targets ≥ 44px: `--size-field: 0.28125rem` у темі `cupcake`.
6. Style guide у [docs/design/ui-style.md](../../design/ui-style.md) — джерело правди для наступних епіків.

## Scope

### 1. Фундамент (Phase 1)

- Тема: override `--size-field` у `src/index.css`.
- UI-примітиви: `Icon`, `IconButton`, `Toolbar`, `Page`, `ListRow`, `Sheet`, `Fab`, `Skeleton`, `Toast`; розширення `Button`, `Badge`, `Alert`, `AppText`, `EmptyState`.
- `AppLayout`: full-bleed shell + floating dock-пілюля, `ToastViewport`.
- `ThemeShowcase` як живий style guide.
- Залежності: `@dnd-kit/react`, `@dnd-kit/helpers`.
- Документація: цей файл, рядок 3b у [next-steps.md](../next-steps.md), [ui-style.md](../../design/ui-style.md).

### 2. Міграція екранів (Phase 2)

- AuthShell, Sign-in, Sign-up, Onboarding, Join — шаблон Auth.
- Checklists, Checklist detail, Team, Today, History — шаблони Tab-root / Detail.
- TaskSheet / ChecklistSheet / ConfirmSheet з chips і weekday-колами.
- `SortableTaskList` з grip-handle, long-press, keyboard reorder, optimistic move + rollback.

### 3. Тести та QA

- Unit-тести примітивів і sortable.
- Browser QA 390×844 і 768px+.

## Поза scope

- Today workflow і Realtime (Епік 4).
- Історія виконань (Епік 5).
- Capacitor native.

## Перевірка

- [x] `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` (13 файлів, 40 тестів).
- [x] `pnpm build`.
- [x] Dock, toolbar, FAB, sheet, list rows працюють на мобільній ширині (Chromium 390×844 і desktop).
- [x] DnD reorder зберігається після reload (keyboard reorder, порядок у БД через RPC).
- [x] Member не бачить owner-дій (handle, FAB, sheets).
- [x] Browser QA на новій оболонці закриває mobile gate Епіка 3.

## Definition of Done

- [x] Усі примітиви експортовані з `src/components/ui/index.ts` і задокументовані в style guide.
- [x] `AppLayout` використовує floating dock; legacy `Modal`/`Screen`/`Card` лишаються для сумісності до завершення міграції.
- [x] Усі auth і app роути мігровані на нові шаблони.
- [x] SortableTaskList з DnD замінює кнопки «вгору»/«вниз».
- [x] Quality gates проходять; browser QA 390px і 768px+ підтверджена.
- [x] Статус епіка оновлено в master roadmap.

## Результат

Todoist-like оболонка: floating toolbar у `bg-base-200` pill, великі заголовки, full-bleed `list`/`list-row`, pill dock, FAB над dock, bottom `Sheet` (centered modal на `sm+`), DnD reorder через `@dnd-kit`, style guide [ui-style.md](../../design/ui-style.md) і `/ui-kit` showcase. Browser QA пройдена в Chromium (desktop і 390×844): sign-in, checklists, detail (3 tasks), create/edit sheets, keyboard DnD, team, invite sheet — без horizontal overflow; dock і FAB поважають safe-area. Під час QA виправлено: `ListRow` a11y (`display: contents`), toolbar join border, FAB позиціонування на wide screens, touch targets, tab-root navigation (`resolveActiveTeamTab`).

**Залишковий ризик:** реальні iOS Safari / Android Chrome не перевірялись (лише Chromium emulation). Follow-up для Епіка 5 (Web MVP stabilization), не blocker.
