# Епік 6c. Адмінська консоль платформи

Статус: `NEXT` — стартовано 9 вересня 2026 року. Операційний епік супроводу
beta, а не продуктова фіча: додається поза чергою Epic 6/6b, щоб власник міг
бачити стан продукту без ручних SQL-запитів у Supabase Dashboard.

## Мета

Дати власнику продукту (не власнику окремої команди) бачити загальний стан
Checklister — кількість юзерів, команд, чеклістів, задач і виконань, динаміку
за 7/30 днів, і список команд з їхньою активністю — на окремому маршруті
`/admin`.

## Залежності

Уся авторизація в системі досі спиралась лише на `teams.owner_id`. Цей епік
закладає перший платформний seam: роль **супер-адміна** — таблицю
`private.super_admins` і хелпер `private.is_super_admin()`. Дані для метрик
уже існують (`auth.users`, `public.teams`, `public.team_members`,
`public.checklists`, `public.tasks`, `public.task_completions`,
`public.team_invites`) — схема не змінюється, лише нові read-only RPC.

## Scope

1. Таблиця `private.super_admins`, хелпери `private.is_super_admin()` і
   `public.is_super_admin()` (`supabase/migrations/20260909170000_platform_admin.sql`,
   перейменовано в `20260909180000_super_admin_rename.sql` — перша міграція
   вже була застосована на проді, тому перейменування зроблено новою
   міграцією, а не редагуванням застосованої).
2. RPC `public.get_platform_overview()` і `public.get_platform_teams(...)` —
   назви не змінені: вони описують дані всієї платформи, а не роль адміна.
3. pgTAP `supabase/tests/super_admin.test.sql`.
4. Регенеровані типи `src/types/database.generated.ts`.
5. Feature-модуль `src/features/admin/`.
6. Guard `RequireSuperAdmin`, маршрут `/admin`, пункт меню «Адмінка».
7. Frontend-тести для нового маршруту та пункту меню.

## Поза scope

- Будь-які адмінські дії (бан юзера, видалення команди тощо) — лише read-only
  метрики в цій ітерації.
- Метрики підписок/оплат — з'являться після
  [monetization.md](../monetization.md), на тому самому seam'і.
- Індекс під вікна по `completed_at` на `task_completions` — на beta-обсягах
  не потрібен; зафіксовано як відомий майбутній крок у міграції.

## Як стати супер-адміном

Ручна дія в Supabase SQL editor (не в міграції й не в `seed.sql` — роздача
платформних прав за email у міграції є небезпечним прецедентом):

```sql
insert into private.super_admins (user_id, note)
select id, 'founder' from auth.users where email = '<email облікового запису на проді>'
on conflict (user_id) do nothing;
```

## Перевірка

- `pnpm db:up && pnpm supabase:reset && pnpm supabase:test`.
- `pnpm db:types && pnpm verify` (typecheck + ESLint + Vitest).
- Ручний прохід у браузері: бутстрап супер-адміна локально → `/admin` показує
  цифри, що збігаються з прямим SQL; не-адмін редіректиться на `/today` і не
  бачить пункт «Адмінка» в меню.

## Definition of Done

- Обидва RPC розгорнуті в production (`pnpm db:push`) після проходження
  локальних тестів, і бутстрап-SQL виконано на проді для власника.
- `/admin` доступний з меню акаунта лише для супер-адмінів.
- `pnpm verify` і `pnpm supabase:test` проходять.
