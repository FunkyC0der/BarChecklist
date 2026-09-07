# Історичний запис — Епік 2. Team lifecycle та membership

> Historical record only; this file is not current instruction.

Статус: `DONE` — ручну QA підтвердив користувач 5 вересня 2026 року.

## Мета

Дати користувачу повний життєвий цикл команди: створення, вибір активної команди, запрошення, приєднання, перегляд учасників і керування складом відповідно до owner/member permissions.

## Залежності

- Епік 1 завершений.
- Hosted development Auth і RLS перевірені.

## Зафіксовані рішення

- Один користувач може належати кільком командам; active team зберігається локально в браузері для конкретного user ID.
- Invite — rotatable bearer link із 256-bit token, SHA-256 hash у БД і строком дії 7 днів. Одне активне посилання може приєднати необмежену кількість різних користувачів; нове посилання відкликає попереднє.
- Owner не передає ownership і не може вийти з команди; member може self-leave.
- Owner може назавжди видалити команду лише після введення її точної назви; cascade видаляє дочірні дані.

## Scope

1. Уточнити UX-flow і threat model запрошень.
2. Додати міграції для invite-моделі, якщо вона потрібна.
3. Додати server-side функції для безпечного accept/revoke invite.
4. Розширити RLS і pgTAP для invite, owner, member та outsider.
5. Додати active-team state без глобального state framework.
6. Реалізувати onboarding після першого входу.
7. Реалізувати створення команди з назвою та IANA timezone.
8. Реалізувати список/перемикання команд, якщо дозволено кілька.
9. Реалізувати Team screen зі списком учасників.
10. Реалізувати invite create/copy/revoke та join flow.
11. Реалізувати видалення member із захистом owner.
12. Додати loading, empty, error, expired і permission states.
13. Синхронізувати зміни команди, складу та invite через Supabase Realtime.

## Поза scope

- Checklist/task CRUD.
- Today workflow.
- Розширені ролі на кшталт manager/editor.
- Billing і organization administration.

## Перевірка

- Новий користувач створює команду й автоматично стає owner/member.
- Запрошений користувач приєднується рівно один раз.
- Прострочене або відкликане запрошення не працює.
- Outsider не бачить команду або її учасників.
- Member не може змінювати owner-only дані.
- Owner не може випадково видалити власне membership.
- Timezone зберігається і відображається коректно.
- Owner бачить join, leave або remove учасника без reload.

## Definition of Done

- [x] Двоє реальних тестових акаунтів проходять create → invite → join → remove flow на development preview.
- [x] RLS/pgTAP, Jest, lint, format check, typecheck і Web export проходять локально.
- [x] Hosted migration застосовано, generated schema звірено з hosted development і preview оновлено.
- [x] Published `/join/[token]` перевірений у браузері: public route, reload і safe local return path працюють.
- [x] Active team стабільно відновлюється після reload на рівні unit-тестів і реалізації localStorage fallback.

## Закриття блокера

Фінальний acceptance flow вимагав двох реальних test accounts, яких автоматичний агент не створює самостійно. Користувач підтвердив проходження create → invite → join → remove вручну, тому епік закритий.

## Наступний gate

Checklist CRUD починається лише після перевірки membership permissions.
