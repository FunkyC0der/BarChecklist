# Bar Checklist: покрокова roadmap

Оновлено: 5 вересня 2026 року.

Цей документ є master roadmap. Кожен епік має окремий файл-план і реалізується окремим циклом: уточнення рішень → погодження плану → реалізація → перевірка → закриття епіка.

## Як рухатися по roadmap

1. Брати в роботу лише перший незавершений епік.
2. Перед кодом перевірити відкриті рішення у файлі епіка.
3. За потреби актуалізувати й погодити план саме цього епіка.
4. Реалізувати тільки його scope, не підтягуючи наступні функції.
5. Виконати всі acceptance criteria та quality gate.
6. Зафіксувати результат у файлі епіка і перейти до наступного.

Статуси: `DONE` — завершено; `NEXT` — наступний; `PLANNED` — заплановано; `BLOCKED` — потрібна зовнішня дія; `DEFERRED` — свідомо відкладено; `SUPERSEDED` — замінено пізнішим рішенням.

## Загальна послідовність

| Епік | Назва                              | Статус     | Результат                                                                    |
| ---- | ---------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| 0    | Web foundation                     | DONE       | Локальний Web-фундамент, UI kit, Auth, БД, RLS, Realtime і тести             |
| 1    | Cloud development preview          | DONE       | Робочий development URL на EAS Hosting із hosted Supabase                    |
| 2    | Team lifecycle та membership       | DONE       | Повний цикл create → invite → join → remove підтверджений вручну             |
| 2b   | Stack migration                    | DONE       | React + Vite + daisyUI 5 (web-only); Auth URLs і Vercel env готові           |
| 3    | Checklist і task management        | DONE       | Owner CRUD/reorder; mobile browser gate закрито QA Епіка 3b (5 вересня 2026) |
| 3b   | Mobile UI shell                    | DONE       | Todoist-like shell: dock, FAB, Sheet, DnD reorder, style guide, `/ui-kit`    |
| 4    | Today workflow та Realtime         | NEXT       | Команда виконує актуальні задачі дня зі синхронізацією між браузерами        |
| 5    | History та Web MVP stabilization   | PLANNED    | Історія, повні UI states і стабільний наскрізний Web MVP                     |
| 6    | Closed Web beta                    | PLANNED    | Реальні команди тестують продукт у контрольованому beta-середовищі           |
| 7    | Beta fixes та production hardening | PLANNED    | Виправлені реальні проблеми, стабілізовані UX, security і data model         |
| 8    | iOS та Android foundation          | SUPERSEDED | Expo native / EAS Build скасовано; Capacitor відкладено                      |
| 9    | Mobile beta та release readiness   | SUPERSEDED | Store-релізи залишаються окремим рішенням після майбутнього native           |

## Епіки

### Епік 0. Web foundation — DONE

Завершено: Expo SDK 57 Web SPA, Node 24/pnpm, NativeWind Cupcake UI kit, Supabase schema/RLS/Realtime, Web Auth, protected routes, timezone utilities, tests, production export і браузерна QA.

### Епік 1. Cloud development preview — DONE

План: [epic-01-cloud-preview.md](./epics/epic-01-cloud-preview.md)

Завершено: hosted Supabase `bar-checklist` (`eu-west-1`, ref `ujpbumiognmqmgvomvtm`), EAS environment `development`, міграції, Auth URL configuration і preview https://bar-checklist--development.expo.app. Локальні та hosted RLS/trigger перевірки, auth flow, protected routes і browser reload пройдені.

### Епік 2. Team lifecycle та membership — DONE

План: [epic-02-team-membership.md](./epics/epic-02-team-membership.md)

Завершено: реалізація, локальні/hosted database checks, `/join/[token]` flow і ручна QA create → invite → join → remove. Користувач підтвердив acceptance двома реальними акаунтами 5 вересня 2026 року.

### Епік 2b. Stack migration — DONE

План: [epic-02b-stack-migration.md](./epics/epic-02b-stack-migration.md)

Завершено: React + Vite + Tailwind 4 + daisyUI 5 + Supabase (web-only). Hosted Auth Site URL / Redirect URLs оновлені під Vite `5173` і `*.vercel.app`. Vercel project `bar-checklist` має `VITE_SUPABASE_URL` і `VITE_SUPABASE_PUBLISHABLE_KEY`. Git і перший деплой ще не підключені.

### Епік 3. Checklist і task management — DONE

План: [epic-03-checklists-tasks.md](./epics/epic-03-checklists-tasks.md)

Завершено: checklist є контейнером, cadence і weekdays належать кожній задачі; owner CRUD/reorder, member read-only, soft-delete, ліміти й deep link перевірені. Локальні pgTAP/frontend gates, browser QA fixed scrollable detail UI та hosted migration/smoke test пройдені 5 вересня 2026 року. Mobile browser gate закрито QA Епіка 3b 5 вересня 2026 року.

### Епік 3b. Mobile UI shell — DONE

План: [epic-03b-mobile-ui-shell.md](./epics/epic-03b-mobile-ui-shell.md)

Завершено: Todoist-like оболонка (floating toolbar, full-bleed `list-row`, pill dock, FAB, bottom `Sheet`, DnD reorder через `@dnd-kit` з optimistic rollback), UI-примітиви (`Page`, `Toolbar`, `ListRow`, `Sheet`, `Fab`, `Skeleton`, `Toast`, `Icon`, `IconButton`), style guide [ui-style.md](../design/ui-style.md) і `/ui-kit`. Quality gates (`lint`, `format`, `typecheck`, `test` — 13 файлів, 40 тестів) і browser QA в Chromium (desktop + 390×844) пройдені 5 вересня 2026 року. Реальні iOS/Android — follow-up для Епіка 5.

### Епік 4. Today workflow та Realtime — NEXT

План: [epic-04-today-realtime.md](./epics/epic-04-today-realtime.md)

Починається після завершення Епіка 3b, на шаблоні Tab-root із тим самим рядком задачі (маркер стає чекбоксом виконання).

### Епік 5. History та Web MVP stabilization

План: [epic-05-history-web-mvp.md](./epics/epic-05-history-web-mvp.md)

Завершення цього епіка означає feature-complete Web MVP.

### Епік 6. Closed Web beta

План: [epic-06-closed-web-beta.md](./epics/epic-06-closed-web-beta.md)

Починається лише після повного Web MVP quality gate.

### Епік 7. Beta fixes та production hardening

План: [epic-07-beta-stabilization.md](./epics/epic-07-beta-stabilization.md)

Тривалість визначається результатами тестування реальними користувачами.

### Епік 8. iOS та Android foundation — SUPERSEDED

План: [epic-08-native-foundation.md](./epics/epic-08-native-foundation.md)

Expo `dev-client` і EAS Build більше не плануються. Capacitor native — окремий епік після стабільного Web MVP.

### Епік 9. Mobile beta та release readiness — SUPERSEDED

План: [epic-09-mobile-beta-release.md](./epics/epic-09-mobile-beta-release.md)

Store-релізи залишаються окремим рішенням після native-епіка; цей Expo-епік не виконується.

## Загальні правила для всіх епіків

- UI використовує daisyUI 5 class names і семантичні кольори теми `cupcake`.
- `primary` залишається кольором головної дії, без довільних продуктових кольорів.
- RLS є реальною межею доступу; UI guards не замінюють database security.
- Schema changes виконуються лише міграціями з pgTAP-перевірками.
- Нові бібліотеки додаються тільки за доведеної потреби.
- Кожен епік завершується lint, format check, typecheck, Vitest, відповідними DB-тестами, Vite build і браузерною QA.
