# Checklister agent guide

This is the single source of truth for repository guidance. `AGENTS.md` and
`CLAUDE.md` both refer here; update this file rather than either entrypoint.

## Workspace rules

- Stack: React + Vite + Tailwind CSS 4 + daisyUI 5 (Cupcake); Supabase provides
  Auth, Postgres, RLS, and Realtime.
- Before writing HTML/JSX, start at `.agents/skills/daisyui/SKILL.md`, then load
  only task-relevant references/components. For Vite, Tailwind 4, and
  Capacitor 8, use their current official docs; Expo SDK docs do not apply.
- Database changes are migrations only. Every schema, RLS, or RPC change must
  have a matching pgTAP test; RLS is the access boundary, not UI guards.

## Roadmap gate

Use `docs/plans/next-steps.md` and the current epic plan as the source of
truth. Work only on the first incomplete, unblocked epic. Epic 6 (Closed Web
beta) is the current gate; Epic 7 remains planned. Finish its scope,
verification, and definition of done before changing roadmap status or starting
another epic.

## Start here

| Task                          | One starting point                                                          |
| ----------------------------- | --------------------------------------------------------------------------- |
| Small known code change       | The relevant source module; no overview required                            |
| New product behavior or scope | `docs/plans/next-steps.md`                                                  |
| Beta operations               | `docs/plans/epics/epic-06-closed-web-beta.md`                               |
| HTML/JSX/Tailwind/daisyUI     | `.agents/skills/daisyui/SKILL.md`, then task-relevant references/components |
| Visual policy                 | `docs/design/ui-style.md`                                                   |
| Schema, RLS, or RPC           | `supabase/migrations/` and its matching pgTAP test                          |
| Real-device smoke             | `docs/qa/beta-smoke-real-devices.md`                                        |
| Historical lookup             | `docs/README.md`, then `docs/plans/archive/` or `docs/qa/archive/`          |

## Efficient implementation workflow

Choose the smallest complete verification gate. For TypeScript, TSX, or
configuration changes, run `pnpm verify`. It runs typecheck, ESLint, and the
full Vitest suite even when an earlier check fails, so one run reports the full
set of failures. For edits limited to these agent guides, run
`pnpm verify:docs`. For database, RLS, or RPC changes, run `pnpm verify` and
`pnpm supabase:test`.

Database verification needs the local stack. Run `pnpm db:up` first: it starts
Docker if needed, reports when another Supabase project holds port 54322, and
brings the stack up with every migration applied. Always reach the CLI through
the `pnpm supabase:*` scripts; a bare `supabase` command is not on `PATH`
because the CLI is a devDependency.

Treat ESLint as the source of truth for unused imports and similar static
checks; do not manually grep for them between edits. Before verification,
inspect the complete intended change with `git diff`; use `git diff --check` to
catch whitespace errors.

When changing unfamiliar behavior, read the affected route or component, its
feature query/API module, nearest tests, and the relevant provider(s) in one
batch before editing. Decide how the test boundary will be mocked before
writing production code. Do not open roadmap or historical documents for a
small, scoped code change unless it changes product scope or an existing rule
requires it.

## Application map

- `src/app-shells.tsx` owns the provider order: `MotionConfig` →
  `QueryClientProvider` → `ToastProvider` → `AuthProvider` → `TeamProvider` →
  `SessionGate`.
- `src/app-router.tsx` owns the route tree. Authenticated pages are children of
  its pathless `app-shell` route, which keeps `AppLayout` mounted across sibling
  tab navigation.
- Feature API and query modules are colocated under `src/features/<feature>/`.
  Supabase is accessed through `getSupabase()` in `src/lib/supabase`.
- Vitest is configured for jsdom in `vite.config.ts` and loads
  `src/test/setup.ts`. The setup provides Testing Library matchers and a
  spyable no-op `window.scrollTo`.

## Data model

There is no schedule history and no occurrence table. A day exists only as a
_logical date_ — `(now() at time zone team.timezone)::date` — and the only rows
that persist are completions.

- `task_completions` holds one row per `(task_id, completion_date)`. Done means
  an active row (`undone_at is null`); not done means no such row. Undo is soft.
- Whether a task belonged to a past day is _computed_, never stored:
  `private.task_is_scheduled(cadence, weekdays, logical_date)`. Because
  `tasks.cadence`, `tasks.weekdays` and the soft-delete flags describe the
  current state only, a past day can be reconstructed but not recovered
  exactly. `get_history` therefore treats a task as scheduled for a past day
  when it is currently active, was created on or before that day, and its
  current cadence matches.
- `tasks.cadence` and `tasks.weekdays` are both `not null`, and the
  `task_schedule_matches_cadence` constraint ties them together: `daily` demands
  an empty `weekdays` (`'{}'`, never `null`), `weekly` demands 1–7 unique ISO
  weekdays. Fixtures that pass `null` for a daily task fail on insert.
- Completions are written only through `complete_task` / `uncomplete_task`; the
  `task_completion_prepared` trigger stamps the team, actor and logical date. A
  pgTAP fixture that needs completions on past dates must wrap its inserts in
  `alter table public.task_completions disable trigger task_completion_prepared`
  and re-enable it afterwards.

## Tests and mocks

Mock the Supabase boundary locally with `vi.mock('@/lib/supabase', ...)` rather
than reaching the real client. Use `vi.hoisted` for mock state that must be
configured or asserted outside a mock factory. Provider-dependent tests should
wrap only the provider stack they need and use
`createTestQueryClient()` from `src/test/query-client.ts` for a fresh client
with retries disabled.

Use the closest of these examples before creating a new test fixture:

- Page routes: `src/routes/today.test.tsx`.
- Context providers: `src/features/teams/team-context.test.tsx`.
- Realtime wiring: `src/routes/app-layout-realtime.test.tsx`.
- The real application route tree: `src/routes/app-shell-mount.test.tsx`.
- Memory-router rendering: `src/test/router.tsx`.
