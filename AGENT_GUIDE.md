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
