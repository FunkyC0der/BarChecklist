# Епік 5. History та Web MVP stabilization

Статус: `NEXT` — реалізацію розпочато 6 вересня 2026 року.

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

Реалізація виконується через `sol-orchestrator`: Sol координує агентів із непересічним ownership, приймає cross-task рішення, інтегрує зміни та веде фінальний quality review. Тестування й запуск команд делегуються субагентам; Sol перевіряє evidence і відповідність Definition of Done.

## Поточний результат

- Додано `get_history` і `get_history_filter_options` як security-definer RPC, server-side filters, whole-day cursor pagination, stable ordering і permission boundaries.
- Додано partial active-completions index, generated Supabase types та typed History API/Zod parsing.
- Реалізовано History UI: filter Sheet, date/checklist/user filters, active chips, day groups, loading/empty/error/permission states і load-more.
- Стабілізовано auth return paths/session retry, Realtime degraded/reconnect refresh, route retry states, labels/landmarks/focus behavior і mobile overflow/safe-area layout.
- Local gates зелені: lint, format check, typecheck, Vite build; Vitest — 21 files / 81 tests.
- Remote Supabase project `ujpbumiognmqmgvomvtm`: migration `20260905223827` applied; RPC, index і grants verified.
- Local Chromium public/unauthenticated QA пройдена на 1280×900, 768×900 і 390×844: direct `/history` redirect/reload, no overflow, no runtime errors. Accessibility label/contrast/landmark defects знайдені, виправлені й повторно перевірені.

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

- [ ] Web MVP feature-complete: team → checklist setup → Today → history.
- [ ] Повний quality gate зелений локально та на development preview.
- [x] Відомі некритичні обмеження задокументовані для beta.

## Залишкові blockers та evidence gaps

- Docker недоступний, тому history pgTAP suite із 31 assertion ще не виконано.
- Vercel preview upload очікує explicit authorization на source/build-output.
- Authenticated owner/member/outsider hosted QA ще не виконано.
- Реальні desktop Safari, iPhone Safari та Android Chrome недоступні для перевірки.
- Vite bundle advisory: 753.60 kB; не блокує локальний build, але потребує beta follow-up.

## Наступний gate

До beta переходити лише після окремого go/no-go review.
