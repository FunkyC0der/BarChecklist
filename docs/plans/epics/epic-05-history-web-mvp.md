# Епік 5. History та Web MVP stabilization

Статус: `DONE` — закрито 7 вересня 2026 року явним product-owner `GO`; unrun real-device gate перенесено в Епік 6.

## Мета

Додати корисну історію виконань і довести всі Web-сценарії до цілісного, доступного та стабільного MVP перед реальною beta.

## Залежності

- Епік 4 завершений.
- Completion data model перевірена реальними паралельними сценаріями.

## Рішення перед стартом

- Основні фільтри історії: дата, checklist, user.
- Історія read-only; активні completion-записи зберігаються безстроково до видалення team.
- За замовчуванням показуються останні 14 logical days; custom date/checklist/user filters і cursor pagination не ділять день між сторінками.
- Які зміни історичних даних дозволені owner/member.
- У деталях використовуються поточні назви task/checklist/profile, включно із soft-deleted сутностями.
- Browser matrix: desktop Chrome/Safari, Chromium 1280×900, 768×900, 390×844, iPhone Safari та Android Chrome.

## Реалізаційний workflow

Реалізація виконується через `model-orchestrator`: оркестратор координує агентів із непересічним ownership, приймає cross-task рішення, інтегрує зміни та веде фінальний quality review. Тестування й запуск команд делегуються субагентам; оркестратор перевіряє evidence і відповідність Definition of Done.

## Поточний результат

- Додано `get_history` і `get_history_filter_options` як security-definer RPC, server-side filters, whole-day cursor pagination, stable ordering і permission boundaries.
- Додано partial active-completions index, generated Supabase types та typed History API/Zod parsing.
- Реалізовано History UI: filter Sheet, date/checklist/user filters, active chips, day groups, loading/empty/error/permission states і load-more.
- Стабілізовано auth return paths/session retry, Realtime degraded/reconnect refresh, route retry states, labels/landmarks/focus behavior і mobile overflow/safe-area layout.
- Post-fix local frontend gate зелений: lint, format check, typecheck, Vitest — 25 files / 90 tests, Vite build і `git diff --check`; build зберігає advisory про 756.98 kB JS chunk.
- Local pgTAP gate зелений: 5 files / 167 assertions, включно з History 31/31, після відтворюваного reset лише disposable local Docker DB з актуальних migrations.
- Remote Supabase project `ujpbumiognmqmgvomvtm`: migration `20260905223827` applied; RPC, index і grants verified.
- Local Chromium public/unauthenticated QA пройдена на 1280×900, 768×900 і 390×844: direct `/history` redirect/reload, no overflow, no runtime errors. Accessibility label/contrast/landmark defects знайдені, виправлені й повторно перевірені.
- Vercel preview `dpl_GPKUqZF5uv6eGVt4tUByNsP8Pajn` має стан `READY`: <https://bar-checklist-kf2b1qxvo-krasochenkodev-2202s-projects.vercel.app>. SSO protection збережено, automation bypass після QA відсутній.
- Hosted Chromium QA пройдена в ізольованих owner/member/outsider сесіях: default 14 days, date/checklist/user filters, whole-day load-more, soft-deleted names, member read-only UI, outsider redirect/isolation, reload і responsive widths. Console/page-error scans чисті; disposable team/auth fixtures повністю очищені.
- Повний machine evidence: [epic-05-hosted-browser-evidence.md](../../qa/epic-05-hosted-browser-evidence.md).
- UX stabilization follow-up після візуального review: реєстрація більше не вимагає membership, no-team акаунт лишається на `/today` і створює команду у вкладці `Команда`; Sheet не мають handle/`X`, отримали сильніші headings і компактні поля; новий checklist одразу відкривається у detail. Додані focused route/component tests. Надані screenshots є лише візуальною діагностикою, не real-device `PASS`.
- Локальний multi-team/invite follow-up: Team має завжди видимий selector membership і дію створення ще однієї команди; перемикання інвалідує старі member/invite requests. Owner генерує invite круглою кнопкою біля `Учасники`; popup не рендерить URL і має одну дію `Поділитися` через Web Share або clipboard fallback. Повний локальний frontend gate після цього incremental change зелений: lint, format check, typecheck, Vitest (27 files / 102 tests), Vite build і `git diff --check`; build має advisory про 757.74 kB JS chunk. Оновлений preview/browser/device rerun до product-owner waiver не виконувався.
- Підсумковий release gate 7 вересня 2026 року: lint, format check, typecheck, Vitest (27 files / 102 tests), Vite production build, pgTAP (5 files / 167 assertions) і `git diff --check` — `PASS`. Є лише non-blocking advisory про 758.07 kB JavaScript chunk.
- Product owner дав явний `GO` закрити Епік 5 і почати Епік 6 без фактичного real-device acceptance. Результати desktop Safari, iPhone Safari та Android Chrome не створювалися й не позначалися `PASS`; вони лишаються `PENDING` і переходять у першу beta smoke wave.

## Scope

1. Спроєктувати history query та потрібні indexes.
2. Додати migration/pgTAP за потреби.
3. Реалізувати список історичних днів і completion details.
4. Додати погоджені фільтри та pagination.
5. Зберегти зв’язок із soft-deleted checklist/tasks.
6. Завершити loading, empty, error і permission states усіх Web-екранів.
7. Перевірити keyboard navigation, focus order і accessible labels.
8. Перевірити responsive layout на desktop/tablet/mobile Web widths.
9. Перевірити auth confirmation, expired sessions і reconnect behavior.
10. Додати критичні integration tests без надмірної тестової інфраструктури.
11. Виконати повний regression pass.

## Поза scope

- Business analytics dashboard.
- Export CSV/PDF.
- Native apps.
- Публічний production launch.

## Перевірка

- Історія узгоджується з task completions у БД.
- Soft-deleted сутності не ламають старі записи.
- Великі списки не блокують UI.
- Усі основні flows доступні з keyboard.
- Прямі URL, reload, expired session і reconnect працюють.
- У консолі браузера немає runtime errors.

## Definition of Done

- [x] Web MVP feature-complete: team → checklist setup → Today → history.
- [x] Machine-run release gate зелений локально; актуальний build призначений для публічного production hosted smoke на старті Епіка 6.
- [x] Відомі некритичні обмеження задокументовані для beta.

## Закриття з waiver та evidence gaps

- Post-fix local frontend gate пройдений 6 вересня 2026 року: lint, format check, typecheck, Vitest (25 files / 90 tests), Vite build і `git diff --check` зелені; build зберігає advisory про 756.98 kB JS chunk.
- Незалежний verifier виявив team-create regression: `insert(...).select('*').single()` застосовував teams SELECT RLS до доступності membership і міг завершуватися `42501`/rollback. Повернуто безпечний non-RETURNING insert; наступний `refreshTeams()` активує першу membership. Regression test фіксує відсутність `.select()`/`.single()` у `createTeam()`. Schema і hosted state не змінювалися.
- Старий preview/browser evidence не приписується новому коду; актуальний hosted smoke виконується на production entrypoint під час старту Епіка 6.
- Multi-team/invite incremental follow-up повторно охоплено повним local frontend gate: lint, format check, typecheck, Vitest (27 files / 102 tests), Vite build і `git diff --check` зелені. Hosted/browser/real-device статус не змінювався.
- Local database і hosted preview/browser gates пройдені; деталі та cleanup зафіксовані в [hosted browser evidence](../../qa/epic-05-hosted-browser-evidence.md).
- Evidence gap: реальні desktop Safari, iPhone Safari та Android Chrome не перевірені. Усі результати лишаються `PENDING` у [ручному QA-чеклісті](../../qa/epic-05-manual-device-checklist.md); product-owner waiver знімає їх як blocker Епіка 5, але не перетворює на `PASS`.
- Preview лишається захищеним Vercel SSO. Для перенесеного real-device gate використовується публічний production entrypoint без Vercel SSO; Checklister auth лишається ввімкненим.

## Переданий gate

У першій контрольованій beta smoke wave користувач виконує real-device checklist і додає фактичні `PASS`/`FAIL`/`BLOCKED` результати. Будь-який критичний `FAIL` зупиняє розширення beta cohort і переходить у issue log Епіка 6; screenshots або device emulation не замінюють результат реального пристрою.
