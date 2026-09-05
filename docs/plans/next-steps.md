# Bar Checklist: покрокова roadmap

Оновлено: 4 вересня 2026 року.

Цей документ є master roadmap. Кожен епік має окремий файл-план і реалізується окремим циклом: уточнення рішень → погодження плану → реалізація → перевірка → закриття епіка.

## Як рухатися по roadmap

1. Брати в роботу лише перший незавершений епік.
2. Перед кодом перевірити відкриті рішення у файлі епіка.
3. За потреби актуалізувати й погодити план саме цього епіка.
4. Реалізувати тільки його scope, не підтягуючи наступні функції.
5. Виконати всі acceptance criteria та quality gate.
6. Зафіксувати результат у файлі епіка і перейти до наступного.

Статуси: `DONE` — завершено; `NEXT` — наступний; `PLANNED` — заплановано; `BLOCKED` — потрібна зовнішня дія; `DEFERRED` — свідомо відкладено.

## Загальна послідовність

| Епік | Назва                              | Статус   | Результат                                                             |
| ---- | ---------------------------------- | -------- | --------------------------------------------------------------------- |
| 0    | Web foundation                     | DONE     | Локальний Web-фундамент, UI kit, Auth, БД, RLS, Realtime і тести      |
| 1    | Cloud development preview          | DONE     | Робочий development URL на EAS Hosting із hosted Supabase             |
| 2    | Team lifecycle та membership       | BLOCKED  | Реалізація готова; потрібна ручна QA flow двома реальними акаунтами   |
| 3    | Checklist і task management        | PLANNED  | Owner створює, редагує, видаляє та впорядковує чеклісти й задачі      |
| 4    | Today workflow та Realtime         | PLANNED  | Команда виконує актуальні задачі дня зі синхронізацією між браузерами |
| 5    | History та Web MVP stabilization   | PLANNED  | Історія, повні UI states і стабільний наскрізний Web MVP              |
| 6    | Closed Web beta                    | PLANNED  | Реальні команди тестують продукт у контрольованому beta-середовищі    |
| 7    | Beta fixes та production hardening | PLANNED  | Виправлені реальні проблеми, стабілізовані UX, security і data model  |
| 8    | iOS та Android foundation          | DEFERRED | Нативні development builds без розгалуження бізнес-логіки             |
| 9    | Mobile beta та release readiness   | DEFERRED | Перевірені мобільні збірки, готові до окремого рішення про реліз      |

## Епіки

### Епік 0. Web foundation — DONE

Завершено: Expo SDK 57 Web SPA, Node 24/pnpm, NativeWind Cupcake UI kit, Supabase schema/RLS/Realtime, Web Auth, protected routes, timezone utilities, tests, production export і браузерна QA.

### Епік 1. Cloud development preview — DONE

План: [epic-01-cloud-preview.md](./epics/epic-01-cloud-preview.md)

Завершено: hosted Supabase `bar-checklist` (`eu-west-1`, ref `ujpbumiognmqmgvomvtm`), EAS environment `development`, міграції, Auth URL configuration і preview https://bar-checklist--development.expo.app. Локальні та hosted RLS/trigger перевірки, auth flow, protected routes і browser reload пройдені.

### Епік 2. Team lifecycle та membership — BLOCKED

План: [epic-02-team-membership.md](./epics/epic-02-team-membership.md)

Реалізація, локальні/hosted database checks і development preview готові. До `DONE` лишається ручна QA flow create → invite → join → remove двома реальними test accounts; епік 3 не починати до її завершення.

### Епік 3. Checklist і task management

План: [epic-03-checklists-tasks.md](./epics/epic-03-checklists-tasks.md)

Починається після готового team context і перевірених owner/member permissions.

### Епік 4. Today workflow та Realtime

План: [epic-04-today-realtime.md](./epics/epic-04-today-realtime.md)

Починається після стабільного CRUD чеклістів і задач.

### Епік 5. History та Web MVP stabilization

План: [epic-05-history-web-mvp.md](./epics/epic-05-history-web-mvp.md)

Завершення цього епіка означає feature-complete Web MVP.

### Епік 6. Closed Web beta

План: [epic-06-closed-web-beta.md](./epics/epic-06-closed-web-beta.md)

Починається лише після повного Web MVP quality gate.

### Епік 7. Beta fixes та production hardening

План: [epic-07-beta-stabilization.md](./epics/epic-07-beta-stabilization.md)

Тривалість визначається результатами тестування реальними користувачами.

### Епік 8. iOS та Android foundation

План: [epic-08-native-foundation.md](./epics/epic-08-native-foundation.md)

Не починати до закриття критичних beta-проблем Web-версії.

### Епік 9. Mobile beta та release readiness

План: [epic-09-mobile-beta-release.md](./epics/epic-09-mobile-beta-release.md)

Окреме рішення про App Store/Google Play реліз приймається лише після mobile beta.

## Загальні правила для всіх епіків

- UI використовує React Native primitives, NativeWind і Cupcake semantic tokens.
- `primary` залишається кольором головної дії, без довільних продуктових кольорів.
- RLS є реальною межею доступу; UI guards не замінюють database security.
- Schema changes виконуються лише міграціями з pgTAP-перевірками.
- Нові бібліотеки додаються тільки за доведеної потреби.
- Кожен епік завершується lint, format check, typecheck, Jest, відповідними DB-тестами, Web export і браузерною QA.
- Мобільні залежності та збірки не додаються до завершення Web beta.
