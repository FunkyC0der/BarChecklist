# Checklister

Web SPA for a team checklist product. The UI uses React, Vite, Tailwind CSS 4, and daisyUI 5 (Cupcake). Supabase provides Auth, Postgres, RLS, and Realtime.

The Web MVP is feature-complete and is entering a controlled closed-beta smoke phase. Native (Capacitor iOS/Android) remains deferred to a later epic.

## Requirements

- Node.js 24 LTS (`.nvmrc`)
- pnpm 11.18.0
- Docker Desktop for local Supabase

## Setup

```bash
pnpm install
pnpm supabase:start
cp .env.example .env.local
pnpm dev
```

Use the `API URL` and `PUBLISHABLE_KEY` printed by `pnpm supabase:start` in `.env.local`:

```text
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`VITE_SUPABASE_ANON_KEY` is supported only as a temporary fallback. During the stack migration, `EXPO_PUBLIC_SUPABASE_*` keys in `.env.local` are still accepted. Prefer the `VITE_` names going forward. Never add a secret or service-role key to a `VITE_` or `EXPO_PUBLIC_` variable.

## Verification

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm supabase:reset
pnpm supabase:test
pnpm db:types
pnpm build
pnpm preview
```

The production bundle is written to `dist/`.

## Production / beta hosting

Web hosting is Vercel (`vercel.json` SPA rewrite to `index.html`). The controlled beta entrypoint is the production alias documented in the active Epic 6 plan; Vercel preview protection remains enabled and is not the external beta boundary.

- Hosted Supabase project identifier: `bar-checklist` in `eu-west-1` (`ujpbumiognmqmgvomvtm`)
- Auth Site URL and Redirect URLs must include the Vercel domain and `http://localhost:5173`
- Vercel env: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` only. No secret or service-role key belongs in a client environment.

The previous EAS Hosting preview (`https://bar-checklist--development.expo.app`) is retired with this stack.
