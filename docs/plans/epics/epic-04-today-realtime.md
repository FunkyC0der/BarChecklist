# Епік 4. Today workflow та Realtime

Статус: `DONE` — завершено 6 вересня 2026 року.

## Мета

Створити головний щоденний сценарій: показати актуальні за timezone команди задачі, дозволити member виконувати їх і синхронізувати стан між браузерами.

## Залежності

- Епік 3 завершений.
- Розклад і порядок задач стабільні.

## Рішення перед стартом

- Completion може скасувати його автор або owner команди.
- Today одразу показує ім’я виконавця та локальний час команди.
- Зміна timezone або schedule застосовується до поточного стану Today і синхронізується через Realtime.
- Конкурентне виконання є ідемпотентним: один completion, другий клієнт сходиться до canonical snapshot без помилки.
- UI використовує optimistic update з rollback/retry після помилки та canonical refresh після відповіді сервера.

## Scope

1. Формально описати обчислення logical local date і активного schedule.
2. Розширити unit/DB тести для DST, UTC boundary і weekly schedules.
3. Реалізувати серверний API/RPC для безпечного complete/uncomplete, якщо direct table operations недостатні.
4. Перевірити unique completion race conditions.
5. Реалізувати Today query для активної команди й дати.
6. Реалізувати task completion UI через Cupcake components.
7. Додати pending, success, conflict і retry states.
8. Підключити team-scoped Realtime subscription.
9. Коректно оновлювати локальний state і чистити subscription.
10. Обробити midnight/date transition без ручного reload.
11. Перевірити роботу у двох паралельних браузерах.

## Поза scope

- Розширена історична аналітика.
- Offline-first режим.
- Push notifications.
- Native background refresh.

## Перевірка

- Показуються лише активні за logical date задачі всередині активних checklist.
- Completion user/team/date неможливо підробити клієнтом.
- Неактивну або soft-deleted задачу не можна виконати.
- Два браузери однієї команди бачать update без reload.
- Outsider не бачить рядок чи Realtime payload.
- Одночасне виконання не створює дубль.
- Перехід через північ і DST перевірений тестами.

## Definition of Done

- [x] Два members проходять повний спільний Today flow.
- [x] Дані залишаються коректними після reload і конкурентних дій.
- [x] Realtime/RLS/date quality gate проходить.

## Стан реалізації — 6 вересня 2026

- Реалізовано timezone-aware Today snapshot, server-owned complete/uncomplete RPC, author-or-owner undo і soft undo для надійного Realtime payload під RLS.
- Додано team-scoped Realtime для completion, checklist, task і timezone/team updates; midnight transition оновлює snapshot без reload.
- Локальні gates пройдені: ESLint, Prettier, TypeScript, Vite build, Vitest — 16 файлів / 52 тести, pgTAP — 4 файли / 136 тестів.
- Локальний browser QA пройдено у двох незалежних сесіях: member/owner completion і undo, performer/time, reload persistence, live schedule/timezone зміни, outsider boundary, mobile 390×844 і desktop 768×900; console errors відсутні.
- Міграцію `20260905140000_epic04_today_realtime.sql` застосовано до hosted Supabase і підтверджено remote migration history.
- Hosted `supabase test db --linked` не запускає suite, бо в remote database не встановлено pgTAP; локальний pgTAP gate повністю зелений.
- Production deployment `dpl_53FGhBzap9c8KKtsGNeTC9uQ67Y7` має статус `READY`: https://project-ygm8l.vercel.app. Vercel збирає Vite output з `dist/`; deployment створено з Git HEAD `93a9a3a000994a747746d780d85c3fbf06c4c38f` і поточних незакомічених змін Epic 4.
- Hosted browser QA пройдено в ізольованих owner/member/outsider сесіях: schedule filtering, completion/author undo/owner undo, performer/time, reload persistence, near-concurrent UI convergence до одного completion, live schedule і timezone transitions, outsider isolation, mobile 390×844 і desktop 768×900. Console errors застосунку відсутні.
- Disposable QA-команду з checklist, tasks, memberships і completions видалено штатним owner flow; owner і member синхронно повернулися до onboarding. Тестові auth-акаунти залишено, тимчасові Vercel aliases видалено.

## Наступний gate

Після стабільного Today flow додати історію і завершити Web MVP.
