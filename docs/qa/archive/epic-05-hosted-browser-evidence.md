# Історичний запис — Епік 5 — evidence локальних gate і hosted browser QA

> Historical record only; this file is not current instruction.

Дата: 6 вересня 2026 року.

> Це evidence зафіксувало hosted baseline до локального UX stabilization follow-up 6 вересня. Воно не підтверджує нові no-team, Sheet і create→detail зміни на preview; для них потрібен окремий deployment/browser rerun. Скріншоти, що ініціювали follow-up, використані лише як візуальна діагностика й не рахуються як device `PASS`.

## Local database gate

- Target: disposable local Supabase Docker database at `127.0.0.1:54322`; linked hosted data was not reset.
- `rtk pnpm exec supabase db reset --local --no-seed` recreated the local database only and applied all 11 repository migrations through `20260905223827_epic05_history.sql`.
- `rtk pnpm exec supabase test db` passed all 5 files / 167 assertions. `history.test.sql` passed 31/31 assertions.
- The first test attempt exposed a stale previously-running local function body. A read-only linked-project query confirmed that hosted `get_history` already matched the current migration; no hosted schema change was made.

## Vercel preview

- Target: preview, not production.
- URL: <https://bar-checklist-kf2b1qxvo-krasochenkodev-2202s-projects.vercel.app>
- Deployment: `dpl_GPKUqZF5uv6eGVt4tUByNsP8Pajn`, state `READY`.
- Verified link: project `bar-checklist`, project ID `prj_XCIx1mf3i46eDHGt3tHg9dqQuyyz`, team `krasochenkodev-2202s-projects`.
- Remote build completed `tsc --noEmit && vite build`; preview has both required `VITE_SUPABASE_*` variables (values were not read or recorded).
- Vercel SSO protection remains enabled for `all_except_custom_domains`; final automation-bypass count is `0`.

## Hosted Chromium QA

Browser automation used the installed Google Chrome `152.0.7977.82` in isolated owner, member, outsider, and public sessions. Vercel access used short-lived OIDC headers; no token or Checklister password was persisted in the repository or evidence.

| Role/session | Viewport                               | Actual result                                                                                                                                                                                                                                                     |
| ------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public       | `1280×900`                             | Direct `/history` settled on `/sign-in`; heading `Вхід`; `scrollWidth = clientWidth = 1280`; console and page-error scans empty.                                                                                                                                  |
| Owner        | `1280` wide, then `768×900`, `390×844` | History loaded 14 default logical days. Direct `/history` reload stayed on History at exact 768 and 390 widths; no horizontal overflow. Mobile screenshot was visually inspected: history rows, metadata, filter button and dock were readable and unobstructed.  |
| Member       | `768×900`                              | Same 14-day History data was readable, including owner/member performers and soft-deleted names. Reload stayed on `/history`; no horizontal overflow; console and page-error scans empty. Checklist screen exposed no owner action in the accessibility snapshot. |
| Outsider     | `390×844`                              | Direct authenticated `/history` settled on `/onboarding`; no QA team or History row text was exposed; no horizontal overflow; console and page-error scans empty.                                                                                                 |

Owner History cases exercised against 18 disposable logical days:

- current task/checklist and soft-deleted task/checklist names rendered together with performer and time;
- date range `2026-08-20` through `2026-09-06` produced `Завантажити ще` after 14 whole-day groups;
- load-more reached the final 20 August group and removed the pagination button without duplicating or splitting a day;
- archived-checklist filter returned 9 day groups, contained only the archived task, and kept the `(архівний)` filter option;
- member-performer filter returned 6 day groups and no owner completion rows.

## Disposable fixture cleanup

The isolated team `Epic 5 QA c7f91` contained two memberships, two checklists/tasks (one soft-deleted pair), and 18 active completions. The owner deleted the team through the normal UI confirmation flow; owner and member then returned to onboarding.

Final read-only hosted counts for the exact recorded QA IDs are all zero: teams, memberships, checklists, tasks, completions, auth users, profiles, and auth sessions. The three disposable sessions were revoked before deleting their auth users. All four browser sessions were closed.

## Local UX follow-up gate — not hosted evidence

After the UX stabilization changes, an independent verifier found that adding `.select('*').single()` to `createTeam()` introduced a teams SELECT RLS failure (`42501`) before the new membership was available. The implementation was corrected to use the existing safe non-RETURNING insert followed by `refreshTeams()`; no schema or hosted mutation was made. A regression test now asserts that team creation does not call `.select()` or `.single()`. Checklist creation still returns its inserted row so it can open the new detail route immediately.

The exact post-fix local gate passed on 6 September 2026:

- lint — `PASS`;
- format check — `PASS`;
- typecheck — `PASS`;
- Vitest — `PASS`, 25 files / 90 tests;
- Vite build — `PASS`, with the non-blocking 756.98 kB JavaScript chunk advisory;
- `git diff --check` — `PASS`.

These results are local machine evidence only. They do not mark the UX follow-up as deployed, hosted-browser verified, or real-device verified.

### Incremental multi-team/invite follow-up

The subsequent local Team change adds a visible membership selector and create-another-team action, invalidates stale team-scoped member/invite requests on switching, and replaces the raw invite URL controls with a URL-free success widget plus one `Поділитися` action. Web Share is preferred when available; clipboard is used only when Web Share is unavailable. Cancellation is silent, while success and genuine failure use an accessible text status that does not expose the token.

Focused local evidence on 6 September 2026:

- lint — `PASS`;
- format check — `PASS`;
- typecheck — `PASS`;
- Vitest — `PASS`, 7 files / 33 tests covering selector/current value, create-another flow, switch-race isolation, invite presentation, native-share cancellation/failure, and clipboard fallback boundaries.
- `git diff --check` — `PASS`.

This is incremental local evidence, not a new full gate. Build, all-test, deployment, hosted browser, and real-device verification remain for the independent verifier/user as applicable.

## Still pending

Real desktop Safari, iPhone Safari, and Android Chrome were not run by the agent and are not marked passed. The user must execute [beta-smoke-real-devices.md](../beta-smoke-real-devices.md). Each real device also needs an authorized Vercel team SSO session before Checklister sign-in; deployment protection was not weakened for QA.

The local stabilization follow-up changed the expected outsider/no-team destination from `/onboarding` to `/today`, moved first-team creation onto `/team`, removed Sheet handles/X controls, strengthened Sheet headings, compacted Sheet fields, and made checklist creation open its detail route. The historical hosted outsider result above remains accurate for that deployment but is superseded as the current product expectation.
