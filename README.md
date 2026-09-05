# Bar Checklist

Web-first foundation for a team checklist product. The UI uses Expo Router, React Native primitives, NativeWind, and the daisyUI Cupcake semantic palette. Supabase provides Auth, Postgres, RLS, and Realtime.

This stage intentionally contains authentication, protected routes, UI primitives, database foundations, and placeholder product screens. Checklist CRUD and the complete Today workflow belong to the next Web MVP stage. Native builds are deferred until after the Web beta.

## Requirements

- Node.js 24 LTS (`.nvmrc`)
- pnpm 11.18.0
- Docker Desktop for local Supabase

## Setup

```bash
pnpm install
pnpm supabase:start
cp .env.example .env.local
pnpm web
```

Use the `API URL` and `PUBLISHABLE_KEY` printed by `pnpm supabase:start` in `.env.local`:

```text
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`EXPO_PUBLIC_SUPABASE_ANON_KEY` is supported only as a temporary fallback. Never add a secret or service-role key to an `EXPO_PUBLIC_` variable.

## Verification

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm supabase:reset
pnpm supabase:test
pnpm db:types
pnpm export:web
pnpm export:web:development
pnpm serve:web
```

The generated Web bundle is written to `dist/`.

## Preview deployment

Active development preview: https://bar-checklist--development.expo.app

- EAS project: `@krasdevs-team/bar-checklist` (`27f73b5c-895a-49af-b950-22d30ea1f2fd`)
- Hosted Supabase: `bar-checklist` in `eu-west-1` (`ujpbumiognmqmgvomvtm`)
- Auth Site URL: the stable development preview URL; local and immutable EAS preview URLs are allow-listed.
- EAS `development` contains only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No secret or service-role key belongs in a client environment.

For every development deployment:

```bash
pnpm export:web:development
pnpm deploy:web:preview
```

The export command clears Metro's cache and reads the EAS `development` environment, so it cannot reuse local Supabase values from `.env.local`. The deployment command updates only the `development` alias; it never promotes the app to production.

Production aliases, a custom domain, CI deployment, `expo-dev-client`, SecureStore, and native bundle/package identifiers are intentionally deferred.
