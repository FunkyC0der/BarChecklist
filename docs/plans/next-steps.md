# Checklister roadmap

Оновлено: 7 вересня 2026 року.

Це master roadmap: працюємо лише з першим незавершеним і незаблокованим епіком, окремим циклом уточнення → погодження → реалізація → перевірка → закриття.

Статуси: `DONE` — завершено; `NEXT` — поточний; `PLANNED` — заплановано; `BLOCKED` — потрібна зовнішня дія; `DEFERRED` — свідомо відкладено; `SUPERSEDED` — замінено пізнішим рішенням.

## Послідовність

| Епік | Назва                              | Статус     | Результат                                                     |
| ---- | ---------------------------------- | ---------- | ------------------------------------------------------------- |
| 0    | Web foundation                     | DONE       | Web-фундамент, UI kit, Auth, БД, RLS, Realtime і тести        |
| 1    | Cloud development preview          | DONE       | Hosted development preview                                    |
| 2    | Team lifecycle та membership       | DONE       | Create → invite → join → remove                               |
| 2b   | Stack migration                    | DONE       | React + Vite + Tailwind 4 + daisyUI 5                         |
| 3    | Checklist і task management        | DONE       | Owner CRUD/reorder, member read-only                          |
| 3b   | Mobile UI shell                    | DONE       | Shell, Sheet, DnD, style guide                                |
| 4    | Today workflow та Realtime         | DONE       | Hosted Today/Realtime flow                                    |
| 5    | History та Web MVP stabilization   | DONE       | Feature-complete Web MVP; device gate перенесено в beta smoke |
| 6    | Closed Web beta                    | NEXT       | Контрольована beta smoke wave та operational decisions        |
| 6b   | Статистика учасників команди       | NEXT       | Per-member completion stats у Історія (owner override)        |
| 6c   | Адмінська консоль                  | NEXT       | Платформні метрики та seam для адмінських дій                 |
| 7    | Beta fixes та production hardening | PLANNED    | UX, security і data-model hardening                           |
| 8    | iOS та Android foundation          | SUPERSEDED | Expo native скасовано; Capacitor відкладено                   |
| 9    | Mobile beta та release readiness   | SUPERSEDED | Store-релізи після майбутнього native-рішення                 |

## Операційні плани

- Архівні Epics 1–5: [archive](./archive/).
- Архівні Epics 2b і 3b: [archive](./archive/).
- Поточний Epic 6: [epic-06-closed-web-beta.md](./epics/epic-06-closed-web-beta.md) — закритий Web beta, ізоляція середовища, support/feedback, smoke і cohort gate.
- Epic 6b: [epic-06b-member-stats.md](./epics/epic-06b-member-stats.md) — статистика учасників команди, деталі в [member-stats-spec.md](../member-stats-spec.md).
- Epic 6c: [epic-06c-admin-console.md](./epics/epic-06c-admin-console.md) — адмінська консоль платформи (`/admin`), seam для ролі супер-адміна.
- Запланований Epic 7: [epic-07-beta-stabilization.md](./epics/epic-07-beta-stabilization.md).
- Superseded Epics 8–9: [archive/superseded](./archive/superseded/).

Поточні інваріанти описані в `AGENTS.md`: database changes — migrations із matching pgTAP, RLS — реальна межа доступу, а UI використовує daisyUI 5 semantic theme colors.
