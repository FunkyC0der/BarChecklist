# Епік 3. Checklist і task management

Статус: `PLANNED`.

## Мета

Дозволити owner створювати структуру роботи команди: daily/weekly чеклісти, дні розкладу, задачі та їх порядок.

## Залежності

- Епік 2 завершений.
- Active team context і owner/member permissions стабільні.

## Рішення перед стартом

- UX створення daily та weekly checklist.
- Максимальна кількість чеклістів і задач для MVP.
- Reorder через drag-and-drop чи кнопки переміщення.
- Поведінка soft-deleted checklist/task у майбутній історії.
- Чи дозволене відновлення видаленого елемента в MVP.

## Scope

1. Перевірити поточну schema на потрібні CRUD constraints та indexes.
2. Додати відсутні міграції й RLS-тести.
3. Реалізувати список чеклістів активної команди.
4. Реалізувати create/edit flow для назви, cadence і weekdays.
5. Реалізувати soft-delete з чітким підтвердженням наслідків.
6. Реалізувати список задач усередині checklist.
7. Реалізувати create/edit/soft-delete задачі.
8. Реалізувати надійний reorder без конфлікту `position` constraints.
9. Додати client validation через React Hook Form і Zod.
10. Додати empty/loading/error/permission states.
11. Перевірити responsive Web layout і keyboard navigation.

## Поза scope

- Виконання задач.
- Історія виконань.
- Checklist templates, копіювання та імпорт.
- Nested tasks і складні recurrence rules.

## Перевірка

- Owner може створити daily checklist.
- Owner може створити weekly checklist лише з валідними ISO weekdays.
- Member бачить структуру, але не може її змінювати.
- Reorder зберігається після reload.
- Soft-delete не видаляє пов’язану історію фізично.
- Невалідні назви, schedule і positions блокуються також базою.

## Definition of Done

- Owner повністю налаштовує робочий checklist у браузері.
- Member бачить той самий результат.
- CRUD, RLS, constraints і quality gate пройдені.

## Наступний gate

Today workflow починається після стабільного checklist/task CRUD.
