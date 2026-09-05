# Епік 6. Closed Web beta

Статус: `PLANNED`.

## Мета

Запустити контрольоване тестування Web MVP з невеликою кількістю реальних команд і зібрати структурований feedback без передчасного публічного релізу.

## Залежності

- Епік 5 завершений.
- Є список beta-команд і відповідальна особа за support.

## Рішення перед стартом

- Кількість команд і тривалість beta.
- Критерії відбору учасників.
- Канал support і feedback.
- Які дані дозволено збирати та як довго їх зберігати.
- Backup/recovery policy.
- Go/no-go критерії для запуску beta.

## Scope

1. Створити окремий hosted Supabase beta environment.
2. Налаштувати окремі environment variables і EAS deployment target.
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
