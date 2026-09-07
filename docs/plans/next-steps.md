# Bar Checklist: покрокова roadmap

Оновлено: 7 вересня 2026 року.

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
| 4    | Today workflow та Realtime         | DONE       | Hosted Today/Realtime flow пройшов у трьох ізольованих сесіях                |
| 5    | History та Web MVP stabilization   | DONE       | Web MVP закрито рішенням product owner; device gate перенесено в beta smoke  |
| 6    | Closed Web beta                    | NEXT       | Стартовано: публічний entrypoint готовий; isolation/support рішення відкриті |
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

Завершено: React + Vite + Tailwind 4 + daisyUI 5 + Supabase (web-only). Hosted Auth Site URL / Redirect URLs оновлені під Vite `5173` і `*.vercel.app`. Vercel project `bar-checklist` має `VITE_SUPABASE_URL` і `VITE_SUPABASE_PUBLISHABLE_KEY`; production deployment підтверджено в Епіку 4.

### Епік 3. Checklist і task management — DONE

План: [epic-03-checklists-tasks.md](./epics/epic-03-checklists-tasks.md)

Завершено: checklist є контейнером, cadence і weekdays належать кожній задачі; owner CRUD/reorder, member read-only, soft-delete, ліміти й deep link перевірені. Локальні pgTAP/frontend gates, browser QA fixed scrollable detail UI та hosted migration/smoke test пройдені 5 вересня 2026 року. Mobile browser gate закрито QA Епіка 3b 5 вересня 2026 року.

### Епік 3b. Mobile UI shell — DONE

План: [epic-03b-mobile-ui-shell.md](./epics/epic-03b-mobile-ui-shell.md)

Завершено: Todoist-like оболонка (floating toolbar, full-bleed `list-row`, pill dock, FAB, bottom `Sheet`, DnD reorder через `@dnd-kit` з optimistic rollback), UI-примітиви (`Page`, `Toolbar`, `ListRow`, `Sheet`, `Fab`, `Skeleton`, `Toast`, `Icon`, `IconButton`), style guide [ui-style.md](../design/ui-style.md) і `/ui-kit`. Quality gates (`lint`, `format`, `typecheck`, `test` — 13 файлів, 40 тестів) і browser QA в Chromium (desktop + 390×844) пройдені 5 вересня 2026 року. Реальні iOS/Android — follow-up для Епіка 5.

### Епік 4. Today workflow та Realtime — DONE

План: [epic-04-today-realtime.md](./epics/epic-04-today-realtime.md)

Завершено 6 вересня 2026 року: timezone-aware Today, безпечні complete/uncomplete RPC, optimistic conflict recovery та team-scoped Realtime. Local gates — 52 Vitest і 136 pgTAP; hosted migration та production deployment https://project-ygm8l.vercel.app підтверджені. Owner/member/outsider browser QA пройшов без console errors, disposable team data очищено.

### Епік 5. History та Web MVP stabilization — DONE

План: [epic-05-history-web-mvp.md](./epics/epic-05-history-web-mvp.md)

Функціональність Web MVP завершена: 167 pgTAP assertions, попередній Vercel preview та isolated hosted Chromium owner/member/outsider QA були зелені до UX follow-up. Після візуального review локально додано stabilization для no-team flow, Sheet і create→detail; team-create SELECT RLS regression знайдено verifier-ом і виправлено без schema changes. Наступний incremental follow-up додав завжди видимі multi-team selector/create action, race-safe scoped refresh і URL-free invite sharing. Підсумковий local gate 7 вересня 2026 року зелений: lint, format check, typecheck, Vitest (27 files / 102 tests), Vite build, 5 pgTAP files / 167 assertions і `git diff --check`; build має advisory про 758.07 kB JS chunk.

Product owner 7 вересня 2026 року дав явний `GO` на закриття епіка без очікування real-device acceptance. Це waiver процесного blocker-а, а не вигаданий результат: desktop Safari, iPhone Safari та Android Chrome не запускалися і лишаються `PENDING` у [real-device checklist](../qa/epic-05-manual-device-checklist.md). Точний gate перенесено в першу контрольовану хвилю smoke Епіка 6. Preview protection не послаблюється; зовнішній entrypoint використовує окремий production alias без Vercel SSO.

### Епік 6. Closed Web beta — NEXT

План: [epic-06-closed-web-beta.md](./epics/epic-06-closed-web-beta.md)

Стартовано 7 вересня 2026 року. Публічний entrypoint для зовнішніх тестувальників: <https://project-ygm8l.vercel.app>; Vercel SSO на ньому не має бути зовнішнім бар'єром, але BarChecklist auth лишається нормальною межею застосунку. Перші відкриті рішення: окреме beta Supabase environment, support/feedback owner і канал, beta cohort/термін, retention та backup/recovery policy. До рішення про ізоляцію production deployment тимчасово використовує наявний hosted Supabase project, уже налаштований у Vercel; це не зараховується як виконання isolation criterion.

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
