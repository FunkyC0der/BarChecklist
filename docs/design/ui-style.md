# Єдиний стиль UI

Оновлено: 5 вересня 2026 року.

Цей документ фіксує принципи, токени, типографіку, ритм, мапу компонентів і шаблони екранів для мобільного інтерфейсу Bar Checklist на daisyUI 5 (тема `cupcake`).

## 2. Єдиний стиль

### Принципи (з рефу Todoist)

- Один екран = один із трьох шаблонів (Auth / Tab-root / Detail).
- Full-bleed `bg-base-100`; ніяких карток усередині AppLayout. Ієрархія — типографікою і тонкими розділювачами (`border-base-300/60`). `base-200` — лише для toolbar-пілюлі, dock-пілюлі, chips, плиток іконок і sheet-backdrop-контрасту.
- Заголовок екрана — великий (`text-3xl font-bold`) і живе у скрол-контенті; над ним плаваючий sticky toolbar: кругла back-кнопка ліворуч, пілюля з 1–3 icon-кнопками праворуч.
- Головна дія екрана — FAB `+` (primary-коло над dock). Другорядні дії об'єкта — у `⋯`. Деструктивні — лише в `⋯` та в confirm-sheet.
- Редагування будь-якого об'єкта — bottom sheet (`X` ліворуч зверху, `⋯` праворуч, великий title-input, параметри — chips).
- `primary` = FAB + активний пункт dock + submit у sheet. `error` = лише деструктивні дії й помилки. Статуси — `badge-soft`.
- Touch ≥ 44px: `--size-field 0.28125rem` (45px), рядки `min-h-14`, dock-пілюля 56px, FAB 56px.
- Кожна іконка має `aria-label` або підпис.

### Токени

- `@plugin "daisyui/theme" { name: "cupcake"; default: true; --size-field: 0.28125rem; }`, решта cupcake без змін.
- Іконки: inline SVG 24×24, `stroke-width 1.75`, `size-5` у кнопках/meta, `size-6` у dock, `currentColor`.

### Типографіка (`AppText`)

- `display` → `text-3xl font-bold tracking-tight` — заголовок екрана в контенті; бренд на Auth.
- `heading` → `text-lg font-semibold` — заголовок sheet / EmptyState.
- `label` → `text-base` — назва рядка (як у Todoist, звичайна вага; жирність не потрібна).
- `caption` → `text-sm text-base-content/60` — meta-рядок, описи.
- `overline` → `text-xs font-medium uppercase tracking-wide text-base-content/60` — заголовок секції.

### Ритм

- Контент: `px-4`; title `pt-2 pb-3`; між секціями `gap-6`, overline → рядки `gap-1`.
- Рядок: `min-h-14 py-3 gap-3 items-start`, розділювач знизу `border-b border-base-300/60` крім останнього.
- Toolbar: `h-14 px-4`, sticky, `bg-base-100/90 backdrop-blur`.
- Sheet: `px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]`, grab-handle `mx-auto h-1 w-10 rounded-full bg-base-300`.
- Нижній відступ контенту `pb-32` (dock + FAB).

## 3. Мапа «елемент → daisyUI компонент»

- Dock → `dock dock-sm` + override `inset-x-3 w-auto bottom-[max(0.75rem,env(safe-area-inset-bottom))] rounded-full bg-base-200 shadow-sm pb-0`; кожен пункт `NavLink` = `Icon` + `span.dock-label`; активний `dock-active` + `rounded-full bg-primary text-primary-content` (pill як у Todoist, без underline: `[&>*:after]:hidden`). Ніде більше `tabs` для навігації.
- Toolbar → `div.sticky.top-0.z-20.flex.h-14.items-center.justify-between.px-4` з `bg-base-100/90 backdrop-blur`; back — `IconButton` у `btn btn-circle bg-base-200 border-0` (`chevron-left`); права група — `div.join.rounded-full.bg-base-200 > IconButton.join-item` (1–3 шт.).
- Overflow-меню → `dropdown dropdown-end` + `ul.menu bg-base-100 rounded-box shadow-sm w-52` (деструктивний пункт `text-error`).
- Заголовок екрана → `h1.display` у контенті (`truncate` не потрібен, може переноситись на 2 рядки).
- Секція → `section` з `p.overline` + `ul.list` (без картки).
- Рядок → `ListRow` = `li.list-row px-0 min-h-14`: leading (коло-маркер `span.size-5 rounded-full border-2 border-base-300 mt-0.5` для задач; плитка `size-10 rounded-full bg-base-200` з `Icon` для чеклістів; `avatar avatar-placeholder` для учасників), центр = `label` + meta-рядок (`Icon` 16px + `caption`), trailing (`chevron-right text-base-content/40`, `badge`, `IconButton`, grip-handle).
- Meta-рядок задачі → `Icon calendar` + текст розкладу («Щодня» / «Пн, Ср, Пт») + `Icon repeat`; для чекліста → «5 задач».
- Статус/лічильник → `badge badge-soft badge-sm` («12 / 20» у toolbar-пілюлі або біля title; `badge-primary` для Owner).
- FAB → `div.fab` + `button.btn.btn-lg.btn-circle.btn-primary` (`Icon plus`, `aria-label`), override `bottom-[calc(4.5rem+max(0.75rem,env(safe-area-inset-bottom)))] right-4`; `disabled` на ліміті з `tooltip`-підписом «Ліміт 100 задач».
- Sheet → `dialog.modal modal-bottom sm:modal-middle > modal-box p-0 rounded-t-box max-h-[90dvh] overflow-y-auto`: grab-handle, ряд `IconButton x` (ліворуч) / `IconButton more-horizontal` (праворуч, опційно), контент. Використовується для create/edit/confirm/invite.
- Title-input у sheet → `input input-ghost input-lg w-full px-0 text-xl font-semibold` (без legend; `aria-label`), помилка → `p.label text-error`.
- Chips (одиничний вибір: Щодня / Щотижня) → `input.btn.btn-sm.rounded-full[type=radio][aria-label]` у `flex gap-2 flex-wrap`; активний — стандартний checked-стан `btn`.
- Weekday-кола → `input.btn.btn-sm.btn-circle[type=checkbox][aria-label="Пн"]` ×7 у `flex justify-between`; показуються під chips лише для «Щотижня».
- Поля форми на Auth/Team → `Input` без змін.
- Read-only значення (member) → `ListRow` label + `caption` value.
- Drag-and-drop → `@dnd-kit/react` (`DragDropProvider`, `useSortable`) + `@dnd-kit/helpers` (`move`); handle = `IconButton grip-vertical` з `touch-none` у trailing (owner). Touch: long-press 250ms (default PointerSensor); клавіатура: KeyboardSensor (Space/Enter — взяти, стрілки — рухати, Space — покласти); announcements — вбудовані + наш `aria-live` «Порядок збережено». Під час drag — `bg-base-200 shadow-lg rounded-box` на активному рядку. Drop → optimistic `move` + `reorderTasks(checklistId, ids)` → при помилці rollback + `alert-soft error`.
- Помилка запиту → `alert alert-error alert-soft` першим елементом контенту. Успіх → `Toast` (`toast toast-center` над dock, `alert alert-success alert-soft`, 3с). Ліміт → badge + `disabled` FAB, без alert.
- Завантаження списку → `Skeleton` (`skeleton h-14` ×3 з `gap-3`); екран/guards → `Loading`.
- Порожній стан → `EmptyState`: `Icon` у `size-14 rounded-full bg-base-200`, `heading`, `caption`, CTA `btn btn-primary` (без картки).

## 4. Шаблони екранів (мокапи)

### Шаблон A — Auth (sign-in, sign-up, onboarding, join)

```text
┌──────────────────────────────┐  bg-base-100 (sm+: bg-base-200 + sm:card)
│  (safe top)                  │
│  Bar Checklist               │  display
│  Щоденні чеклісти команди…   │  caption
│                              │
│  Вхід                        │  heading
│  ┌ Email ─────────────────┐  │  Input
│  ┌ Пароль ────────────────┐  │  Input
│  [ alert-soft error ]        │  лише при помилці
│  (        Увійти        )    │  btn btn-primary btn-block btn-lg
│                              │
│  Ще немає акаунта? Зареєстр. │  footer mt-auto, safe bottom
└──────────────────────────────┘
```

Join: той самий шаблон, heading = стан, 1 primary + 1 ghost `btn-block`.

### Шаблон B — Tab-root (Сьогодні, Чеклісти, Історія, Команда)

```text
┌──────────────────────────────┐
│ (safe top)                   │
│                    (▤)(⋯)    │  toolbar: без back; пілюля з icon-кнопками
│ Чеклісти          12 / 20    │  display + badge-soft
│                              │
│ (▤) Відкриття зміни       ›  │  ListRow as Link: плитка, label,
│     5 задач                  │  caption, chevron
│ ─────────────────────────────│  border-base-300/60
│ (▤) Закриття бару         ›  │
│     8 задач                  │
│                              │
│                        (+)   │  fab: btn-lg btn-circle btn-primary (owner)
│ ╭──────────────────────────╮ │  dock-пілюля: bg-base-200 rounded-full
│ │ ☀      ▤      ◔     ⚇   │ │  активний = primary pill
│ │Сьогодні Чеклісти Історія Команда
│ ╰──────────────────────────╯ │
└──────────────────────────────┘
```

### Шаблон C — Detail (checklist detail)

```text
┌──────────────────────────────┐
│ (‹)                 (✎)(⋯)   │  back-коло | пілюля: Редагувати назву, ⋯ → Видалити чекліст
│ Відкриття зміни      7 / 100 │  display + badge-soft
│                              │
│ ○ Увімкнути світло        ⋮⋮ │  маркер, label, grip-handle (owner)
│   ▦ Щодня ⟳                  │  meta: calendar + розклад + repeat
│ ─────────────────────────────│
│ ○ Перевірити касу         ⋮⋮ │  тап по рядку (owner) → TaskSheet
│   ▦ Пн, Ср, Пт ⟳             │
│                              │
│                        (+)   │  fab → TaskSheet (create)
│ ╭──────── dock ────────────╮ │
└──────────────────────────────┘
```

### Team на шаблоні B

```text
│                 (⇄)(⎋)(⋯)    │  ⇄ — перемикач команди (якщо >1), ⎋ — вийти з акаунта, ⋯ → Видалити команду (owner) / Вийти з команди (member)
│ Бар на Подолі                │  display
│ olena@bar.ua                 │  caption
│                              │
│ КОМАНДА                      │  overline
│ ┌ Назва ──────────────────┐  │  owner: Input ×2 + btn «Зберегти» (default)
│ ┌ Timezone ───────────────┐  │  member: ListRow «Назва» / «Бар на Подолі»
│ УЧАСНИКИ                     │
│ (ОК) Олена         [Owner]   │  avatar-placeholder, badge-soft badge-primary
│ (ІП) Іван              (🗑)  │  IconButton trash text-error (owner)
│ ЗАПРОШЕННЯ (owner)           │
│ Активне до 12 вер, 18:00  ›  │  ListRow → InviteSheet (Створити / Копіювати / Поділитися / Відкликати)
```

### Sheet — спільний вигляд (TaskSheet)

```text
┌──────────────────────────────┐
│           ━━━━               │  grab-handle
│ (⨯)                    (⋯)   │  X закрити | ⋯ → Видалити задачу (edit-режим)
│ ○ Помити посуд               │  маркер + input-ghost input-lg text-xl
│ # Відкриття зміни            │  caption-рядок з іконкою (read-only)
│ ─────────────────────────────│
│ ▦ Розклад                    │  overline
│ [ Щодня ] [ Щотижня ]        │  radio chips btn-sm rounded-full
│ (Пн)(Вт)(Ср)(Чт)(Пт)(Сб)(Нд) │  checkbox btn-circle btn-sm (лише weekly)
│ [ alert-soft error ]         │
│ (         Додати         )   │  btn btn-primary btn-block btn-lg
│ (safe bottom)                │
└──────────────────────────────┘
```

ChecklistSheet — той самий каркас з одним title-input. ConfirmSheet — heading «Видалити задачу?», caption з наслідками, `btn btn-error btn-block` + ghost «Скасувати».
