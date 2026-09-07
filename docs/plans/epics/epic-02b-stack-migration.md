# Епік 2b. Міграція на React + Vite + daisyUI (web-only)

Статус: `DONE`

## Мета

Перевести клієнт зі Expo / React Native / NativeWind на React + Vite + Tailwind 4 + daisyUI 5 (web-only), зберігши бізнес-логіку, типи, Supabase contract і поведінку епіка 2. Capacitor/iOS не входить у цей епік.

## Залежності

- Епік 2 реалізований (membership, invites, RLS).
- Legacy hosted Supabase project `bar-checklist` доступний.
- Ручна QA епіка 2 виконується вже на новому стеку після цього епіка.

## Зафіксовані рішення

- Big-bang у цьому репозиторії, гілка `migration/vite-daisyui-capacitor`.
- daisyUI 5 тема `cupcake` як єдине джерело кольорів; RN-імітація `daisy.tsx` видаляється.
- Роутинг: `react-router` v8, `BrowserRouter`.
- Web hosting: Vercel SPA. EAS Hosting виводиться з обігу.
- Capacitor / iOS / Android **відкладені** — цей епік лише web.
- Env: `VITE_SUPABASE_*` замість `EXPO_PUBLIC_*`.

## Scope

1. Vite 8 toolchain, Tailwind 4, daisyUI 5 cupcake.
2. Переписати UI й роутинг на HTML/CSS daisyUI.
3. Зберегти auth, teams, invites, realtime без зміни schema.
4. Vitest замість Jest; ESLint без expo-config.
5. Vercel SPA rewrite і оновлення Auth Redirect URLs (ручний крок).
6. Браузерна QA. Native/Capacitor — окремий епік пізніше.

## Поза scope

- Capacitor, iOS, Android, store-релізи, іконки/splash, push.
- Checklist/task CRUD (епік 3).
- Зміна Supabase schema.

## Перевірка

- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- `pnpm supabase:test` без змін міграцій.
- Sign-up → confirm → sign-in → onboarding → team → invite → join → remove.
- Active tab відновлюється після reload.

## Definition of Done

- [x] Web SPA на Vite + daisyUI cupcake працює локально й збирається в `dist/`.
- [x] Capacitor/iOS не додано (свідомо відкладено).
- [x] EAS Hosting скрипти прибрані; Vercel конфіг додано.
- [x] Quality gate зелений (lint, format, typecheck, Vitest, Vite build).
- [x] `pnpm supabase:test` — 49/49 pgTAP PASS після локального `supabase:reset`.
- [x] Локальна QA епіка 2 двома акаунтами: create → invite → join → remove.
- [x] `.env.local` перейменовано на `VITE_SUPABASE_*` (локальний stack `127.0.0.1:54321`).
- [x] Оновити hosted Supabase Auth Redirect URLs і Vercel env у dashboard.

## Dashboard (закрито 5 вересня 2026)

Hosted Auth URL configuration (`ujpbumiognmqmgvomvtm`):

- Site URL: `http://127.0.0.1:5173`
- Redirect URLs додано: `http://127.0.0.1:5173/**`, `http://localhost:5173/**`, `https://*.vercel.app/**`
- Старі Expo URL (`expo.app`, `:8081`) лишені — вони не заважають Vite-потоку

Legacy Vercel project `bar-checklist` (`prj_XCIx1mf3i46eDHGt3tHg9dqQuyyz`):

- Dashboard: https://vercel.com/krasochenkodev-2202s-projects/bar-checklist
- Env (Config, Production + Preview + Development): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` → hosted `https://ujpbumiognmqmgvomvtm.supabase.co`
- Production deployment `dpl_53FGhBzap9c8KKtsGNeTC9uQ67Y7` (`READY`) підтверджено 6 вересня 2026 року в Епіку 4: https://project-ygm8l.vercel.app. Git integration окремо не підтверджувалася.

## Наступний gate

Hosted Vercel/Supabase flow остаточно підтверджено production QA Епіка 4; актуальний наступний gate визначає master roadmap.
