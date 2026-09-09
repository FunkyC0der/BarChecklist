# Епік 6b. Статистика учасників команди

Статус: `NEXT` — стартовано 9 вересня 2026 року, за прямим рішенням власника
продукту (`docs/plans/member-stats-spec.md`) — прийнято поза чергою, без
очікування закриття Епіка 6.

## Мета

Дати власнику команди бачити, скільки задач виконав кожен учасник за період, і
які саме задачі виконує конкретний учасник — без атрибуції пропущених задач,
якої дані не підтримують.

## Залежності

Дані вже існують у `public.task_completions` (`completed_by`,
`completion_date`, `undone_at`). Схема не змінюється — лише нові read RPC,
індекс і UI поверх наявного `/history`.

## Scope

1. RPC `public.get_member_stats` і `public.get_member_task_stats`
   (`supabase/migrations/20260909150000_member_stats.sql`).
2. pgTAP `supabase/tests/member_stats.test.sql`.
3. Регенеровані типи `src/types/database.generated.ts`.
4. Feature-модуль `src/features/stats/`.
5. Маршрути `/history/stats` і `/history/stats/$userId`, перемикач видів на
   `/history`.
6. Frontend-тести для нових маршрутів і feature-модуля.

## Поза scope

- Атрибуція пропущених задач учасникам (немає моделі призначень).
- Будь-яка агрегація за межами `task_completions` (наприклад, тривалість
  зміни, продуктивність).

## Перевірка

- `pnpm db:up && pnpm supabase:test`.
- `pnpm verify` (typecheck + ESLint + Vitest).
- Ручна перевірка на локальному стеку за сценарієм у
  `docs/plans/member-stats-spec.md` (розділ Verification).

## Definition of Done

- Обидва RPC розгорнуті в production (`pnpm db:push`) після проходження
  локальних тестів.
- `/history/stats` і `/history/stats/$userId` доступні з дока Історія.
- `pnpm verify` і `pnpm supabase:test` проходять.
