# Team member statistics (per-member completion stats)

> Status: admitted to the roadmap as Epic 6b on 2026-09-09, by explicit owner
> decision (out of band, without waiting for Epic 6 to close). See
> `docs/plans/epics/epic-06b-member-stats.md`.

## Context

Today the app can answer "what happened on day X" (`/history`) but not "who does
how much". A team owner running a bar shift has no way to see that one member
closed 40 tasks this month and another closed 3, or which specific tasks a given
member actually does. The request: see per-member statistics — how many tasks
each team member completed, with a per-task breakdown.

The data already exists. `public.task_completions` carries `completed_by`,
`completion_date` and `undone_at`; a completion is "done" exactly when
`undone_at is null`, and `unique (task_id, completion_date)` means at most one
row per task per logical day. So a per-member count is a plain
`count(*) … group by completed_by` — no schema change, only new read RPCs.

**Roadmap status — read before starting.** `AGENT_GUIDE.md` enforces a roadmap
gate, and this feature is not on the roadmap: `docs/plans/next-steps.md` has
Epic 6 (Closed Web beta) as `NEXT`, and
`docs/plans/epics/epic-06-closed-web-beta.md:55` lists "масштабна продуктова
аналітика" as explicitly out of scope. The user's decision for this round is
**plan only — do not implement yet**. This document is the spec to execute once
Epic 6 closes and the work is admitted to the roadmap (Step 0 below).

Deliberate non-goal: **missed tasks are never attributed to a member.** There is
no assignment model and no schedule history, so "N missed" cannot belong to a
person. `get_history` already sidesteps this the same way — its `day_series` CTE
is gated on `p_user_id is null`. Statistics report completions only.

## Placement decision

The user asked whether this belongs on the Команда screen or as a switchable
page inside the Історія tab. **Recommendation: a sub-route of the Історія tab.**

- Same data source (`task_completions`), same mental model ("what already
  happened"), same filters (date range, checklist). Історія answers "коли",
  statistics answers "хто".
- `resolveTeamTabRoot()` in
  [team-tab-storage.ts:13](src/features/teams/team-tab-storage.ts:13) already
  matches `pathname.startsWith('/history/')`, so `/history/stats` keeps the
  Історія dock item highlighted and the last-tab restore working with **zero**
  changes to the dock. The dock stays at 4 items, which
  `docs/design/ui-style.md` sizes it for.
- Команда is membership administration — owner-gated edit/invite/remove flows in
  a 678-line route. Hanging aggregates there mixes concerns and forces an
  owner-only/member-visible gating decision that the data does not need
  (`completions_select_member` already scopes reads to the whole team).

Routes:

| Path                      | Screen                                            |
| ------------------------- | -------------------------------------------------- |
| `/history`                | existing records list, plus a view switcher       |
| `/history/stats`          | ranked member list (Template B, same tab root)    |
| `/history/stats/$userId`  | one member's per-task breakdown (Template C)      |

Filters live in **URL search params** (`?from=&to=&checklist=`) so the period
survives navigation into the member detail and back, and is deep-linkable. Use
`useSearchParams` from `@/lib/router-hooks`.

## Step 0 — roadmap admission (do first, when unblocked)

1. Close Epic 6 per its own definition of done, or get an explicit owner
   decision to admit this feature out of band.
2. Add `docs/plans/epics/epic-XX-member-stats.md` (Ukrainian, mirroring the
   structure of `docs/plans/epics/epic-06-closed-web-beta.md`: мета, обсяг, поза
   обсягом, верифікація, definition of done).
3. Add its row to the epic table in `docs/plans/next-steps.md`.
4. `pnpm verify:docs`.

## Step 1 — migration

New file `supabase/migrations/20260909150000_member_stats.sql` (must sort after
`20260909120000_observability.sql`). Copy the guard prologue and style of
`public.get_history` in that observability migration verbatim: `security
definer`, `set search_path = ''` (every identifier schema-qualified, including
`pg_catalog.now()`), inline membership check against `public.team_members`,
`perform private.log_event('<fn>', '<reason>', jsonb_build_object(...))` on every
failure path, errcodes `42501` (auth/membership) and `22023` (bad input),
camelCase keys in the returned `jsonb`.

### `public.get_member_stats(p_team_id uuid, p_from_date date default null, p_to_date date default null, p_checklist_id uuid default null) returns jsonb`

Returns:

```jsonc
{
  "logicalToday": "2026-09-09",
  "fromDate": "2026-08-11",
  "toDate": "2026-09-09",
  "teamCompletedCount": 128,
  "members": [
    {
      "userId": "…",
      "displayName": "Олег",
      "currentMember": true,
      "completedCount": 54,
      "taskCount": 12,              // distinct tasks touched
      "lastCompletionDate": "2026-09-08" // null when completedCount = 0
    }
  ]
}
```

Rules:

- Range resolution mirrors `get_history`: both `p_from_date`/`p_to_date` or
  neither (else `22023`); default window is `logical_today - 29 … logical_today`
  (30 logical days); `toDate` may not exceed `logical_today`; `fromDate` must be
  `<= toDate`. Logical today is `(pg_catalog.now() at time zone
  team_row.timezone)::date`. No range-length cap — the "Весь час" preset sends
  the team's creation date.
- Membership rows come from a `left join` so **current members with zero
  completions still appear** with `completedCount: 0`.
- Users who have completions in range but have since left appear with
  `currentMember: false` (`union` of the two sources, same shape as
  `get_history_filter_options`'s `users`).
- Only `undone_at is null` rows count. Completions of soft-deleted tasks or
  archived checklists **are** counted, matching `get_history`'s
  `matching_completions` CTE (which does not filter `deleted_at`).
- `p_checklist_id` filters via `tasks → checklists`.
- Ordering: `completedCount desc, displayName asc, userId asc` (deterministic
  for tests).

### `public.get_member_task_stats(p_team_id uuid, p_user_id uuid, p_from_date date default null, p_to_date date default null, p_checklist_id uuid default null) returns jsonb`

```jsonc
{
  "userId": "…",
  "displayName": "Олег",
  "currentMember": true,
  "fromDate": "…", "toDate": "…", "logicalToday": "…",
  "completedCount": 54,
  "tasks": [
    {
      "taskId": "…", "taskTitle": "Помити шейкери",
      "checklistId": "…", "checklistName": "Закриття",
      "checklistArchived": false,   // checklists.deleted_at is not null
      "taskArchived": false,        // tasks.deleted_at is not null
      "completedCount": 21,
      "lastCompletionDate": "2026-09-08"
    }
  ]
}
```

`p_user_id` is required (`22023` when null). The target user need not be a
current member (they may have left); the **caller** must be a member of the
team. Ordering: `completedCount desc`, then `checklists.created_at`,
`checklists.id`, `tasks.position`, `tasks.id`.

Splitting into two RPCs (rather than nesting the task breakdown inside
`get_member_stats`) bounds the payload: a team may hold up to 20 checklists ×
100 tasks, so a nested shape is O(members × tasks) worst case. The breakdown is
fetched only for the member the user opens.

### Index and grants

```sql
create index if not exists task_completions_member_stats_idx
on public.task_completions (team_id, completed_by, completion_date)
where undone_at is null;
```

(The existing `task_completions_history_active_idx` is keyed
`(team_id, completion_date desc, task_id)` and does not serve the
group-by-member scan.)

```sql
revoke all on function public.get_member_stats(uuid, date, date, uuid)
  from public, anon, authenticated;
revoke all on function public.get_member_task_stats(uuid, uuid, date, date, uuid)
  from public, anon, authenticated;
grant execute on function public.get_member_stats(uuid, date, date, uuid) to authenticated;
grant execute on function public.get_member_task_stats(uuid, uuid, date, date, uuid) to authenticated;
```

## Step 2 — pgTAP test

New file `supabase/tests/member_stats.test.sql`, structured like
`supabase/tests/history_missed.test.sql` (own fixtures, own UUID band — claim
`…71`+, since `…51`–`…54` and `…61`–`…62` are taken). Team timezone `'UTC'` so
`(now() at time zone 'UTC')::date` is a stable logical today. Backdated
completions must be wrapped in
`alter table public.task_completions disable trigger task_completion_prepared;`
… re-enable, per `AGENT_GUIDE.md`.

Cases to cover:

1. Counts per member are correct within the default 30-day window.
2. A current member with no completions appears with `completedCount = 0`.
3. A former member with in-range completions appears with
   `currentMember: false`.
4. `undone_at is not null` rows are excluded.
5. Completions outside the range are excluded; an explicit range includes them.
6. `p_checklist_id` narrows both RPCs.
7. `teamCompletedCount` equals the sum of member counts.
8. `get_member_task_stats` returns per-task counts in the documented order, with
   `checklistArchived` true for a soft-deleted checklist that still has
   historical completions.
9. Errors: unauthenticated → `42501`; non-member caller → `42501`; only one of
   from/to → `22023`; `toDate` in the future → `22023`; `fromDate > toDate` →
   `22023`; null `p_user_id` → `22023`.
10. Grants: `anon` has no execute, `authenticated` does (both functions), via
    `has_function_privilege`.
11. `to_regclass('public.task_completions_member_stats_idx') is not null`.

## Step 3 — generated types

`pnpm db:up` → `pnpm supabase:reset` if needed → `pnpm db:types` to regenerate
`src/types/database.generated.ts`, so `getSupabase().rpc('get_member_stats', …)`
type-checks.

## Step 4 — feature module `src/features/stats/`

Model it directly on
[history-api.ts](src/features/history/history-api.ts) —
Zod schema → `parseOrLog` → inferred types, null params **omitted** from the rpc
argument object so SQL defaults apply.

- `stats-api.ts` — `memberStatsSchema`, `memberTaskStatsSchema`, types
  `MemberStats`, `MemberTaskStats`, `StatsFilters`
  (`{ fromDate, toDate, checklistId }`), and `fetchMemberStats(query)` /
  `fetchMemberTaskStats(query)`. Log events: `stats.members.parse-failed`,
  `stats.member-tasks.parse-failed`. Context keys must stay within the logger
  allowlist (`teamId`, `userId` pass; display names must never be logged — see
  `docs/ops/observability.md`).
  - Small shared refactor: `unwrapRpcResult` is currently private to
    `history-api.ts:71`. Export it from `@/lib/supabase` and have both modules
    import it rather than duplicating.
- `stats-queries.ts` — `memberStatsQueryOptions(teamId, filters)` and
  `memberTaskStatsQueryOptions(teamId, userId, filters)` via `queryOptions`,
  plus `emptyStatsFilters` and `defaultStatsRange(logicalToday)`. Reuse the
  team-scoped `placeholderData` guard from
  [history-queries.ts](src/features/history/history-queries.ts) so stale data
  from the previous team never renders.
- Query keys in [query-client.ts](src/lib/query-client.ts:6):
  ```ts
  memberStats: (teamId, filters) => ['stats', teamId, 'members', filters],
  memberTaskStats: (teamId, userId, filters) =>
    ['stats', teamId, 'member', userId, filters],
  statsForTeam: (teamId) => ['stats', teamId],
  ```

Checklist filter options are **not** a new RPC — reuse
`historyOptionsQueryOptions` / `fetchHistoryFilterOptions`, which already returns
`{ checklists, users }` for the team.

## Step 5 — UI

Before writing any JSX, read `.agents/skills/daisyui/SKILL.md`, then
`components/tab.md`, `components/list.md`, `components/avatar.md`,
`components/badge.md`, `components/progress.md` and `colors/SKILL.md`.
`docs/design/ui-style.md` forbids cards inside `AppLayout`, so **do not** use
daisyUI `stats`/`stat` — the sanctioned primitives are overline sections,
`ul.list` + `ListRow`, `badge badge-soft badge-sm`, and `avatar
avatar-placeholder`. `primary` stays reserved for the FAB, active dock item and
sheet submit.

### View switcher

New shared component (`src/features/history/history-view-tabs.tsx`) rendered as
the first child of `<Page>` on both `/history` and `/history/stats`: a
`<nav aria-label="Вигляд історії">` holding two `Link`s styled with daisyUI
`tabs tabs-box` (the `base-200` pill is allowed by the style guide's chip/pill
carve-out), each carrying `aria-current="page"` when active — the same
`aria-current` + active-class pattern the dock nav uses in
[app-layout.tsx](src/routes/app-layout.tsx). Labels: `Записи` / `Статистика`.
The switcher preserves the current search params.

### `/history/stats` — `src/routes/history-stats.tsx` (`HistoryStatsRoute`)

- `<Page title="Статистика">` with a filter `IconButton` in `actions` and a
  `titleBadge` `<Badge size="sm" soft>` showing the active filter count, exactly
  as `history.tsx` does.
- Period control: a row of preset chips — `7 днів` / `30 днів` / `Весь час` —
  plus a `Свій період` entry that opens the filter `Sheet`. Presets write
  `from`/`to` into search params. `Весь час` uses
  `logicalDate(new Date(activeTeam.created_at), activeTeam.timezone)` via
  [dates.ts](src/lib/dates.ts) as `from` and `logicalToday` as `to`, so no extra
  RPC surface is needed for "all time".
- Filter `Sheet`: two `type="date"` `Input`s (`max={logicalToday}`,
  `min={draft.fromDate}`) and the checklist `select`, mirroring `history.tsx`'s
  sheet, with Скинути / Застосувати.
- Body: an overline section `Учасники` + `ul.list` of `ListRow`s, one per
  member, `to={/history/stats/${userId}?…}`:
  - `leading`: `<div className="avatar avatar-placeholder">` with
    `initials(displayName)` from
    [team-display.ts](src/features/teams/team-display.ts) — same as the Учасники
    list in `team.tsx`.
  - `title`: display name, with a `badge badge-soft badge-sm` "Колишній
    учасник" when `currentMember` is false.
  - `meta`: `«N виконано · X% · остання активність DD.MM»`; for a zero member,
    `«Немає виконаних завдань»`.
  - `trailing`: the count in a `badge badge-soft`.
  - Optionally a thin `progress` bar per row showing share of
    `teamCompletedCount` — decide during implementation; skip if it fights the
    row rhythm.
- State ladder copied from `history.tsx`, in order: team `loading` → `Skeleton
  rows={5}`; team `error` → `Alert color="error"` + Повторити calling
  `refreshTeams()`; no `activeTeam` → `EmptyState` with a `/team` CTA; query
  loading → `Skeleton rows={5}`; `isPermissionError` → dedicated Alert
  («У вас немає доступу до статистики цієї команди.»); query error → `Alert` +
  retry; empty → `EmptyState` («Ще немає виконаних завдань» vs «Нічого не
  знайдено» when filters are active).

### `/history/stats/$userId` — `src/routes/history-stats-member.tsx`

Template C detail screen: `<Page back="/history/stats" title={displayName}>`,
inheriting the period from search params and showing it as a caption. Body:
tasks grouped by checklist — one overline per checklist name (with a
«Архівний» badge when `checklistArchived`), then `ul.list` of `ListRow`s
(`title` = task title, `meta` = last completion date, `trailing` = count badge).
Same state ladder. Empty state: «Цей учасник ще нічого не виконав за період».

### Wiring (four files)

1. [app-router.tsx](src/app-router.tsx) — `shellChild('/history/stats',
   HistoryStatsRoute)` and `shellChild('/history/stats/$userId',
   HistoryStatsMemberRoute)` inside `shellRoute.addChildren([...])`.
2. [team-routes.ts:18](src/features/teams/team-routes.ts:18) — add
   `/history/stats` (and a `^\/history\/stats\/[^/]+$` test) to
   `isKnownProductPath`, otherwise `?returnTo=` after sign-in is rejected.
3. [icon.tsx](src/components/ui/icon.tsx) — add a `chart-bar` icon (24×24 inline
   SVG, `stroke-width 1.75`, `currentColor`) if the switcher or empty state
   needs one; there is no chart icon today.
4. Invalidate the new keys wherever `queryKeys.historyForTeam` is already
   invalidated, so a completion immediately updates the stats:
   [today.tsx:164](src/routes/today.tsx:164),
   [checklist-detail.tsx:103](src/routes/checklist-detail.tsx:103) and `:131`,
   [checklists.tsx:60](src/routes/checklists.tsx:60) — add
   `queryClient.invalidateQueries({ queryKey: queryKeys.statsForTeam(teamId) })`.
   This also covers Realtime, because `useTodayRealtime`'s `onRefresh` is the
   same callback.

`team-tab-storage.ts` needs **no** change (`startsWith('/history/')` already
resolves the tab root). Do **not** add stats to
[use-tab-prefetch.ts](src/features/teams/use-tab-prefetch.ts) — it is a
secondary view inside a tab, and prefetching would cost every user two extra
RPCs on every team load.

## Step 6 — frontend tests

- `src/features/stats/stats-api.test.ts` — mirror
  `src/features/history/history-api.test.ts`: `vi.mock('@/lib/supabase')` with a
  shared `rpc` spy; assert null filters are omitted from the argument object,
  that a valid payload parses, and that an invalid payload throws after being
  logged.
- `src/routes/history-stats.test.tsx` — mirror
  [history.test.tsx](src/routes/history.test.tsx): `vi.hoisted` mock state,
  `vi.mock('@/features/stats/stats-api')`,
  `vi.mock('@/features/teams/team-context')`, `Sheet` stubbed out of
  `@/components/ui` via `importOriginal`, `renderWithRouter` from
  `@/test/router` with `createTestQueryClient()`. Cases: skeleton → ranked list;
  zero-completion member rendered with 0; former-member badge; preset switch
  refetches with the new range; custom range applied from the Sheet; empty state
  vs filtered empty state; permission-denied alert; switching `activeTeam` drops
  stale rows and resets filters.
- `src/routes/history-stats-member.test.tsx` — breakdown grouping, archived
  checklist badge, back link target, empty state.
- `src/routes/history-view-tabs.test.tsx` (or fold into the two route tests) —
  the switcher marks the active view with `aria-current` and preserves search
  params.
- Check whether [app-shell-mount.test.tsx](src/routes/app-shell-mount.test.tsx)
  and [no-team-routing.test.tsx](src/routes/no-team-routing.test.tsx) enumerate
  routes; extend if so.

## Verification

Run in this order:

```bash
pnpm db:up && pnpm supabase:test
```

```bash
pnpm verify
```

`pnpm verify` runs typecheck + ESLint + the full Vitest suite and does not stop
at the first failure, so one run reports everything. Inspect the whole change
with `git diff` and `git diff --check` before verifying. Treat ESLint as the
source of truth for unused imports.

Manual end-to-end check against the local stack (`pnpm dev`), signed in as a
team owner with at least two members and backdated completions:

1. `/history` shows the `Записи | Статистика` switcher; the Історія dock item
   stays highlighted on `/history/stats`.
2. Members are ranked by count; a member with no completions shows 0; the sum of
   member counts equals `teamCompletedCount`.
3. Switching `7 днів` / `30 днів` / `Весь час` changes the numbers and the URL;
   reloading the URL restores the same view.
4. Opening a member shows per-task counts grouped by checklist; back returns to
   the list **with the period preserved**.
5. Completing a task on `/today` in a second browser session updates the stats
   after the Realtime refresh, without a manual reload.
6. Signed in as a non-member (or with a tampered `p_team_id`), both RPCs reject
   with 42501 and the UI shows the permission alert.

Then deploy the migration — a migration that only exists locally is not
deployed:

```bash
pnpm db:push
```

## Files touched

**New:** `supabase/migrations/20260909150000_member_stats.sql`,
`supabase/tests/member_stats.test.sql`, `src/features/stats/stats-api.ts`,
`src/features/stats/stats-queries.ts`, `src/features/stats/stats-api.test.ts`,
`src/features/history/history-view-tabs.tsx`,
`src/routes/history-stats.tsx`, `src/routes/history-stats-member.tsx`,
`src/routes/history-stats.test.tsx`,
`src/routes/history-stats-member.test.tsx`,
`docs/plans/epics/epic-XX-member-stats.md`.

**Modified:** `src/app-router.tsx`, `src/lib/query-client.ts`,
`src/lib/supabase.ts` (export `unwrapRpcResult`),
`src/features/history/history-api.ts` (import it),
`src/features/teams/team-routes.ts`, `src/components/ui/icon.tsx`,
`src/routes/history.tsx` (mount the switcher), `src/routes/today.tsx`,
`src/routes/checklists.tsx`, `src/routes/checklist-detail.tsx`,
`src/types/database.generated.ts` (regenerated),
`docs/plans/next-steps.md`, and `docs/design/ui-style.md` if the switcher and
avatar-row pattern should be recorded as policy.

All user-facing strings are hard-coded Ukrainian — there is no i18n layer.
