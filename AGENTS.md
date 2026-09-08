This file is already in context. Do not read it again.

## Workspace rules

- Stack: React + Vite + Tailwind CSS 4 + daisyUI 5 (Cupcake); Supabase provides Auth, Postgres, RLS and Realtime.
- Before writing HTML/JSX, start at `.agents/skills/daisyui/SKILL.md`, then load only task-relevant references/components. For Vite, Tailwind 4 and Capacitor 8, use their current official docs; Expo SDK docs do not apply.
- Database changes are migrations only. Every schema, RLS or RPC change must have a matching pgTAP test; RLS is the access boundary, not UI guards.

## Roadmap gate

Use `docs/plans/next-steps.md` and the current epic plan as the source of truth. Work only on the first incomplete, unblocked epic. Epic 6 (Closed Web beta) is the current gate; Epic 7 remains planned. Finish its scope, verification and definition of done before changing roadmap status or starting another epic.

## Start here

| Task                          | One starting point                                                          |
| ----------------------------- | --------------------------------------------------------------------------- |
| Small known code change       | The relevant source module; no overview required                            |
| New product behavior or scope | `docs/plans/next-steps.md`                                                  |
| Beta operations               | `docs/plans/epics/epic-06-closed-web-beta.md`                               |
| HTML/JSX/Tailwind/daisyUI     | `.agents/skills/daisyui/SKILL.md`, then task-relevant references/components |
| Visual policy                 | `docs/design/ui-style.md`                                                   |
| Schema, RLS or RPC            | `supabase/migrations/` and its matching pgTAP test                          |
| Real-device smoke             | `docs/qa/beta-smoke-real-devices.md`                                        |
| Historical lookup             | `docs/README.md`, then `docs/plans/archive/` or `docs/qa/archive/`          |
