# Епік 3. Checklist і task management

Статус: `DONE` — реалізацію, локальні/hosted gates і браузерну QA завершено 5 вересня 2026 року.

## Мета

Дозволити owner створювати структуру роботи команди: чеклісти-контейнери, задачі з індивідуальним daily/weekly розкладом та їх порядок. Member бачить ту саму структуру в режимі читання.

## Залежності

- Епік 2 `DONE`: ручна QA create → invite → join → remove підтверджена 5 вересня 2026 року.
- Active team context (`useTeams()`) і owner-перевірка `session.user.id === activeTeam.owner_id` уже використовуються в [src/routes/team.tsx](../../../src/routes/team.tsx).
- Схема `checklists` / `tasks` уже існує з Епіка 0 у [supabase/migrations/202609040001_core.sql](../../../supabase/migrations/202609040001_core.sql), RLS — у [202609040002_rls.sql](../../../supabase/migrations/202609040002_rls.sql).

## Зафіксовані рішення

1. Навігація: `/checklists` — список чеклістів команди; `/checklists/:checklistId` — деталі чекліста із задачами. Deep link має виживати reload, тому tab persistence переходить із точного порівняння шляху на tab root.
2. Create/edit checklist виконується в `Modal` через React Hook Form + Zod і містить лише назву. Розклад належить задачі: cadence обирається двома radio-кнопками (`daily` / `weekly`), weekdays — групою checkbox для ISO-днів 1–7, яка з'являється лише для `weekly`.
3. Ліміти MVP: до 20 активних чеклістів на команду і до 100 активних задач на чекліст. Ліміт є справжньою межею в БД (тригер), а UI лише повідомляє про його досягнення.
4. Reorder робиться кнопками «вгору» / «вниз» без нових залежностей. Drag-and-drop не входить у MVP, бо кнопки одразу дають keyboard і touch доступність. Запис порядку йде через RPC, що перенумеровує всі активні задачі чекліста в одній транзакції.
5. Видалення завжди soft: `update ... set deleted_at = now()`. Hard `DELETE` на `checklists` і `tasks` прибирається (політики + grants), щоб клієнт не міг фізично зруйнувати майбутню історію (`task_completions.task_id` має `on delete restrict`).
6. Soft-delete чекліста каскадно закриває його активні задачі в тій самій транзакції.
7. RLS і далі показує soft-deleted рядки member-ам: Епік 5 має читати назви видалених чеклістів і задач для історії. Фільтр `deleted_at is null` застосовується у клієнтських запитах.
8. Відновлення видалених чеклістів і задач — поза MVP. Підтвердження видалення прямо описує наслідки: елемент зникає з Today, історія зберігається, повернути його в UI не можна.
9. Realtime для `checklists` і `tasks` не входить у цей епік. Структуру змінює лише owner, тому список перечитується після власних мутацій. Публікацію Realtime для цих таблиць додає Епік 4 разом із Today flow.
10. `position` не задається клієнтом. Створення задачі йде через RPC, який рахує наступну позицію під блокуванням рядка чекліста, тому паралельні вкладки не ловлять помилку унікального індексу.
11. Міграція `task_schedules` переносить schedule із `checklists` у `tasks`: перейменовує enum у `task_cadence`, backfill-ить активні й soft-deleted задачі, а потім прибирає schedule колонки чекліста.
12. На detail-роуті нерухомими лишаються заголовок, owner actions, alerts і «Додати задачу». Скролиться лише `ul.list` у фокусованому `min-h-0 flex-1` регіоні з `overflow-y-auto overscroll-contain`.

## Scope

### 1. Міграції

- `public.create_checklist_task(p_checklist_id uuid, p_title text)` — `security definer`, `set search_path = ''`, повертає рядок `public.tasks`. Перевіряє `auth.uid()`, owner-права через `private.is_team_owner`, блокує рядок чекліста (`select ... for update`), відхиляє soft-deleted чекліст, обчислює `coalesce(max(position) + 1, 0)` серед активних задач.
- `public.reorder_checklist_tasks(p_checklist_id uuid, p_task_ids uuid[])` — `security definer`, `set search_path = ''`. Перевіряє owner-права, вимагає, щоб масив точно дорівнював множині активних задач чекліста (без пропусків і дублів), і перенумеровує у дві фази, бо partial unique index `tasks_active_position_unique` перевіряється по рядках:

```sql
update public.tasks
set position = position + 1000000
where checklist_id = p_checklist_id and deleted_at is null;

update public.tasks t
set position = ordered.new_position
from (
  select task_id, (ordinality - 1) as new_position
  from unnest(p_task_ids) with ordinality as u (task_id, ordinality)
) as ordered
where t.id = ordered.task_id;
```

- `public.soft_delete_checklist(p_checklist_id uuid)` — owner-only, ставить `deleted_at` чеклісту і його активним задачам в одній транзакції.
- `public.soft_delete_task(p_task_id uuid)` — owner-only, ставить `deleted_at` задачі; позиції решти не перенумеровуються (порядок зберігається, прогалини закриє наступний reorder).
- Тригери лімітів: `private.enforce_active_checklist_limit` (20 активних на `team_id`) і `private.enforce_active_task_limit` (100 активних на `checklist_id`), обидва `before insert` та `before update` з `errcode = '23514'`.
- Прибрати hard delete: `drop policy checklists_delete_owner on public.checklists;`, `drop policy tasks_delete_owner on public.tasks;`, `revoke delete on public.checklists, public.tasks from authenticated;`.
- `revoke all ... from public` і `grant execute ... to authenticated` для кожної нової функції — за зразком [202609040004_team_membership.sql](../../../supabase/migrations/202609040004_team_membership.sql).
- [20260905125542_task_schedules.sql](../../../supabase/migrations/20260905125542_task_schedules.sql) перейменовує enum у `task_cadence`, переносить `cadence` / `weekdays` в `tasks` із повним backfill, робить ці поля `not null` з daily defaults та constraint-ами ISO-днів. Після цього прибирає schedule з `checklists` і перевизначає `create_checklist_task(uuid, text, task_cadence, smallint[])`.

### 2. pgTAP `supabase/tests/checklists_tasks.test.sql`

Окремий файл у стилі наявних тестів (`begin` → `plan(N)` → фікстури → `finish()` → `rollback`), із перемиканням ролей через `set local role authenticated` і `set_config('request.jwt.claim.sub', ...)`.

Покриття:

- Owner створює checklist без schedule.
- Daily і weekly задачі з валідними ISO-днями зберігаються, а `cadence = 'weekly'` з порожнім масивом, днем `0`, днем `8` або дублями відхиляється базою.
- Member не може вставити, оновити або soft-delete чекліст і задачу (`42501`).
- Outsider не бачить чеклістів і задач команди (0 рядків).
- `create_checklist_task` дає послідовні позиції `0, 1, 2`, зберігає schedule і відхиляє виклик member-а та soft-deleted чекліст.
- `reorder_checklist_tasks` змінює порядок без порушення `tasks_active_position_unique` і відхиляє неповний або сторонній масив id.
- `soft_delete_checklist` ставить `deleted_at` чеклісту і його задачам; `task_completions` для цих задач лишаються в таблиці.
- Виконання soft-deleted задачі блокується наявним тригером `private.prepare_task_completion`.
- Ліміти 20 чеклістів і 100 задач спрацьовують.
- `authenticated` більше не має права `delete` на `checklists` і `tasks`.

### 3. Типи

Після `pnpm supabase:reset && pnpm supabase:test` перегенерувати `pnpm db:types` і закомітити [src/types/database.generated.ts](../../../src/types/database.generated.ts) із новими RPC.

### 4. Data-access шар

`src/features/checklists/checklist-api.ts` за зразком [src/features/teams/team-api.ts](../../../src/features/teams/team-api.ts): плоскі async-функції, `if (error) throw error`, типи з `Database['public']['Tables']`.

- `fetchChecklists(teamId)` — активні чеклісти, `order('created_at')`.
- `fetchChecklist(checklistId)` — один активний чекліст для detail-роуту.
- `createChecklist({ teamId, name, createdBy })`, `updateChecklist(checklistId, { name })`.
- `fetchTasks(checklistId)` — активні задачі, `order('position')`.
- `createTask`, `updateTask`, `reorderTasks`, `deleteChecklist`, `deleteTask` — обгортки над RPC.

### 5. Валідація

`src/features/checklists/checklist-schema.ts` — Zod-схеми, що дзеркалять DB constraints: назва 1–120 символів після trim, заголовок задачі 1–240, `cadence` як enum, `weekdays` як унікальний набір 1–7 із мінімум одним днем для `weekly` і порожній для `daily`. Джерело правди для днів — `isoWeekday` з [src/lib/dates.ts](../../../src/lib/dates.ts).

### 6. Роути та UI

- [src/routes/checklists.tsx](../../../src/routes/checklists.tsx) — список: назва, кількість активних задач, кнопка створення для owner.
- `src/routes/checklist-detail.tsx` — задачі чекліста показують badge cadence та короткий опис schedule; нерухома частина detail-екрана відділена від scrollable `ul.list` через daisyUI `list` / `list-row`.
- `src/features/checklists/checklist-form.tsx` і `task-form.tsx` — RHF + Zod + `Controller` + спільний `Input`, за зразком [src/features/teams/onboarding-form.tsx](../../../src/features/teams/onboarding-form.tsx).
- Реєстрація роуту `/checklists/:checklistId` в [src/app.tsx](../../../src/app.tsx) всередині `AppLayout`.
- Tab persistence: у [src/features/teams/team-tab-storage.ts](../../../src/features/teams/team-tab-storage.ts) додати визначення tab root за префіксом шляху, а в [src/routes/app-layout.tsx](../../../src/routes/app-layout.tsx) підсвічувати таб і зберігати його за цим root, щоб reload на `/checklists/:id` не викидав користувача на `/checklists`.
- Нові UI-примітиви додавати лише за потреби (ймовірно `checkbox` для weekdays) у `src/components/ui/` із re-export у `index.ts`. Перед JSX прочитати відповідні гайди daisyUI 5: `list`, `card`, `modal`, `checkbox`, `radio`, `badge`, `join`, `button`.

### 7. States і доступність

- `Loading` під час первинного завантаження, `EmptyState` для команди без чеклістів і чекліста без задач, `Alert color="error"` для помилок мутацій.
- Member бачить структуру без жодних owner-дій; прямий перехід на detail-роут не показує кнопок редагування.
- Досягнутий ліміт вимикає кнопку створення і пояснює причину.
- Невідомий або soft-deleted `checklistId` дає окремий not-found стан із поверненням до списку.
- Кнопки reorder мають `aria-label`, вимикаються на межах списку, а зміна порядку озвучується через `aria-live` регіон.
- Layout перевіряється на мобільній ширині в межах наявного `max-w-lg` shell.

### 8. Frontend-тести

- Unit-тести Zod-схем: checklist name only; task daily/weekly, межові довжини, відхилення дублів і днів поза 1–7; task schedule formatter і active-day calculation.
- Unit-тести чистої функції обчислення нового порядку для кнопок «вгору» / «вниз» (масив id, індекс, напрямок).
- Unit-тести tab root resolution у `team-storage.test.ts` для `/checklists/:id`.

## Поза scope

- Виконання задач і Today workflow.
- Історія виконань та її UI.
- Realtime для `checklists` і `tasks`.
- Checklist templates, копіювання та імпорт.
- Nested tasks і складні recurrence rules.
- Drag-and-drop reorder і відновлення видалених елементів.

## Перевірка

- Owner створює checklist без schedule та daily/weekly задачі з валідними ISO weekdays.
- Member бачить структуру, але не може її змінювати.
- Reorder зберігається після reload.
- Soft-delete не видаляє пов'язану історію фізично.
- Невалідні назви, schedule і positions блокуються також базою.
- Reload на `/checklists/:checklistId` лишає користувача на тому самому чеклісті.
- Дві вкладки owner-а створюють задачі без помилки унікальної позиції.

## Ризики

- Видалення команди (`deleteTeam` у `team-api.ts`) робить hard `DELETE`, а `task_completions.team_id` і `task_id` мають `on delete restrict`. Після появи перших completions в Епіку 4 видалення команди з історією почне падати. Цей епік лише фіксує проблему; лагодити її треба разом із completions в Епіку 4.
- Прибирання `DELETE`-політик змінює наявний permission matrix, тому pgTAP має явно перевіряти, що owner більше не може зробити hard delete.

## Definition of Done

- [x] Owner повністю налаштовує робочий checklist у браузері: створення, редагування, task schedule, reorder, soft-delete.
- [x] Member бачить той самий результат у read-only режимі.
- [x] Міграція, RPC і тригери лімітів застосовані локально; `src/types/database.generated.ts` перегенеровано.
- [x] `pnpm supabase:test` покриває owner/member/outsider, task cadence, weekdays, reorder, soft-delete і ліміти.
- [x] `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` і `pnpm build` проходять.
- [x] Браузерна QA, включно з fixed detail UI, isolated task-list scroll, мобільною шириною та reload на detail-роуті.
- [x] Hosted міграція застосована, статус епіка оновлено в master roadmap.

## Результат

Checklist став контейнером задач із власними daily/weekly schedules. Browser QA підтвердила owner/member режими, persisted reorder і deep link, task-only wheel/keyboard scrolling, нерухомі controls/tab bar, мобільний layout та limit state. Hosted schema і grants звірені read-only smoke test.
