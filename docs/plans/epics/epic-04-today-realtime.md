# Епік 4. Today workflow та Realtime

Статус: `PLANNED`.

## Мета

Створити головний щоденний сценарій: показати актуальні за timezone команди задачі, дозволити member виконувати їх і синхронізувати стан між браузерами.

## Залежності

- Епік 3 завершений.
- Розклад і порядок задач стабільні.

## Рішення перед стартом

- Хто може скасовувати completion.
- Чи показувати ім’я та час виконавця одразу в Today.
- Поведінка після зміни timezone або schedule посеред дня.
- UX конфлікту, коли два користувачі виконують одну задачу одночасно.
- Чи потрібен optimistic update або достатньо server-confirmed state.

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

- Показуються лише checklist, активні для logical date команди.
- Completion user/team/date неможливо підробити клієнтом.
- Неактивну або soft-deleted задачу не можна виконати.
- Два браузери однієї команди бачать update без reload.
- Outsider не бачить рядок чи Realtime payload.
- Одночасне виконання не створює дубль.
- Перехід через північ і DST перевірений тестами.

## Definition of Done

- Два members проходять повний спільний Today flow.
- Дані залишаються коректними після reload і конкурентних дій.
- Realtime/RLS/date quality gate проходить.

## Наступний gate

Після стабільного Today flow додати історію і завершити Web MVP.
