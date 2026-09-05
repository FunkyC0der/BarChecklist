# Епік 5. History та Web MVP stabilization

Статус: `PLANNED`.

## Мета

Додати корисну історію виконань і довести всі Web-сценарії до цілісного, доступного та стабільного MVP перед реальною beta.

## Залежності

- Епік 4 завершений.
- Completion data model перевірена реальними паралельними сценаріями.

## Рішення перед стартом

- Основні фільтри історії: дата, checklist, user.
- Період зберігання та pagination strategy.
- Які зміни історичних даних дозволені owner/member.
- Мінімальний набір браузерів і viewport для beta.

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

- Web MVP feature-complete: team → checklist setup → Today → history.
- Повний quality gate зелений локально та на development preview.
- Відомі некритичні обмеження задокументовані для beta.

## Наступний gate

До beta переходити лише після окремого go/no-go review.
