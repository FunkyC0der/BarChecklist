# Епік 6. Closed Web beta

Статус: `NEXT` — стартовано 7 вересня 2026 року; епік не завершений.

## Мета

Запустити контрольоване тестування Web MVP з невеликою кількістю реальних команд і зібрати структурований feedback без передчасного публічного релізу.

## Залежності

- Епік 5 завершений.
- Список beta-команд і відповідальна особа за support ще мають бути визначені до розширення cohort.

## Стартовий запис — 7 вересня 2026 року

- Публічний beta entrypoint: <https://project-ygm8l.vercel.app>.
- Production alias має бути доступний анонімно через Vercel edge без Vercel SSO; `/today`, `/checklists`, `/history` і `/team` для гостя мають переводити на BarChecklist `/sign-in`.
- Vercel preview protection лишається ввімкненим і не використовується як зовнішній entrypoint.
- Production deployment використовує вже налаштовані `VITE_SUPABASE_URL` і `VITE_SUPABASE_PUBLISHABLE_KEY` для наявного hosted Supabase project `ujpbumiognmqmgvomvtm`. Це той самий environment, що використовувався development/hosted gates; він не є окремим beta environment.
- Окремий hosted Supabase beta environment не створювався без додаткової авторизації. Isolation requirement лишається відкритим і не позначається виконаним; до його рішення зовнішній cohort має бути малим і контрольованим.
- Перенесений з Епіка 5 real-device gate лишається `PENDING`: desktop Safari, iPhone Safari та Android Chrome мають пройти [manual checklist](../../qa/epic-05-manual-device-checklist.md) у першій beta smoke wave. Жоден unrun check не вважається `PASS`.

## Рішення перед стартом

- Кількість команд і тривалість beta.
- Критерії відбору учасників.
- Канал support і feedback.
- Які дані дозволено збирати та як довго їх зберігати.
- Backup/recovery policy.
- Go/no-go критерії для запуску beta.

Жодне з цих product/operations рішень не вважається закритим самим фактом технічного deployment. До залучення реальних команд потрібно зафіксувати відповідальних, канал feedback/escalation, дозволені дані та retention, backup/recovery policy і межу cohort.

## Scope

1. Створити окремий hosted Supabase beta environment або отримати явне product-owner рішення про тимчасове використання поточного environment з прийняттям ризику.
2. Налаштувати окремі environment variables і Vercel deployment target.
3. Перевірити Auth URLs, email templates і доступи.
4. Виконати migrations та seed лише технічних довідкових даних.
5. Налаштувати мінімальний operational monitoring без надлишкової аналітики.
6. Додати простий feedback mechanism.
7. Підготувати коротку інструкцію для beta-користувачів.
8. Провести smoke test на чистих акаунтах.
9. Підключати команди малими хвилями.
10. Вести issue log з severity, reproduction і affected team.
11. Регулярно переглядати auth, RLS, timezone і Realtime проблеми.

## Поза scope

- Публічна реєстрація для всіх.
- Платежі.
- App Store/Google Play.
- Масштабна продуктова аналітика.

## Перевірка

- Beta середовище ізольоване від development.
- Немає service-role/secret keys у клієнті.
- Backup/recovery процедура перевірена.
- Feedback і critical issue escalation працюють.
- Реальні користувачі проходять core flow без допомоги розробника.

## Definition of Done

- Запланований beta-період завершено.
- Feedback та issues класифіковані.
- Немає невідомих security incidents або втрати даних.
- Сформований пріоритетний backlog епіка 7.

## Наступний gate

Не починати native development, доки критичні beta-проблеми не закриті.
