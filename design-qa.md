# Design QA — 2026-09-08 (current-worktree final browser pass)

## Comparison target and evidence

- **Source visual truth:** `/Users/ruksov/.codex/generated_images/01a07f63-5f79-7b90-a03e-dec34f28643a/exec-59c21728-d201-4b7e-91e6-150cc2e4739c.png` (853 × 1844 px; inferred 393 × 852 CSS px target; density ≈2.17×). Repo copy: `design-qa-artifacts/2026-09-08/source-today-reference.png`.
- **Fresh implementation evidence:** current local worktree at `http://localhost:5173/ui-kit` in Codex In-app Browser, captured inline in the prior QA run at 1280 × 720 CSS px (browser screenshot 1280 × 720 px; effective DPR 1). The browser API exposes no on-disk screenshot export path, so there is no implementation PNG path to link. On this latest rerun the browser surface was no longer exposed.
- **Guest route evidence:** Earlier fresh browser evidence showed `http://localhost:5173/today` redirecting to `http://localhost:5173/sign-in?returnTo=%2Ftoday`. The user reports signing in at `http://localhost:4173/`, but this QA subagent could not see or attach to the in-app browser session; no account was created and no remote/production data was touched.
- **State parity:** not achieved for the source Today screen. The source is an authenticated, populated Today state; the reachable current-worktree route is the guest sign-in state. The UI-kit Sheet state was directly comparable to its rendered demo and was tested interactively.
- **Latest code-gate evidence:** `src/routes/app-layout-focus.test.tsx` passes 2/2 and asserts the outer `bg-base-200` canvas plus inner `bg-base-100 sm:max-w-md` column. The prior desktop canvas P2 is resolved in the latest worktree and is not an active finding.

## Fresh browser checks

- `/ui-kit` rendered with `data-theme="cupcake"`; desktop viewport measured 1280 × 720; `scrollWidth === innerWidth` (1280), with no horizontal overflow.
- Clicking **Відкрити Sheet** opened a visible `role="dialog"` with the expected Ukrainian copy and backdrop.
- Pressing **Escape** closed the Sheet after its transition and restored focus to the **Відкрити Sheet** trigger (`dialogs: 0`, active element text `Відкрити Sheet`).
- A trusted Playwright click on the backdrop closed the Sheet (`dialogs: 0`).
- Console check: no `warn` or `error` entries in the current browser tab.
- `/today` guest behavior is correct and visibly lands on the sign-in form with the return path preserved.
- Reduced-motion runtime emulation was unavailable in this browser surface; only static `motion-reduce` code paths can be checked.

## Findings

No current P0/P1/P2 product finding is established by the available evidence. The prior desktop `base-100` canvas finding is resolved in code and focused test coverage.

## Required fidelity surfaces

- **Typography:** Fresh UI-kit render uses the expected dark-plum Cupcake hierarchy and Ukrainian labels. Point-for-point Today typography cannot be verified without an authenticated same-state render.
- **Spacing/layout rhythm:** Desktop UI-kit has no horizontal overflow at 1280 × 720. The requested 393 × 852 responsive Today capture was unavailable because the browser viewport capability is not exposed in this subagent and no authenticated state exists.
- **Colors/tokens:** `data-theme="cupcake"` confirmed. The latest focused test verifies `base-200` on the outer desktop canvas and `base-100` on the centered `sm:max-w-md` column.
- **Image quality/assets:** Source Today includes a storefront tile; the reachable guest/UI-kit states do not expose that target header asset. Same-state asset fidelity is therefore unverified, not passed.
- **Copy/content:** UI-kit and guest sign-in copy rendered correctly. Authenticated Today task copy and completion metadata remain unverified in this pass.
- **Interaction/accessibility:** Sheet open, trusted backdrop dismissal, Escape dismissal, and focus restoration all passed fresh browser checks. No actionable interaction finding remains from the prior report.

## Comparison history

1. Earlier authenticated pass found desktop `base-100` canvas bleed and Sheet focus restoration; both were recorded as P2.
2. Current-worktree final browser pass revalidated Sheet open, trusted backdrop close, Escape close, and focus restoration successfully. The focus-restoration finding is **resolved** and is not carried as an active issue.
3. Current pass could not obtain an authenticated Today implementation screenshot or 393 × 852 viewport, so state-parity evidence remains blocked. The desktop canvas finding is resolved by the latest implementation and focused test.

## Open questions

- Can a documented local authenticated QA session be made available for a fresh 393 × 852 and desktop Today comparison before handoff?
- The desktop outer canvas split is now implemented and covered by `src/routes/app-layout-focus.test.tsx`.

## Implementation Checklist

1. Re-run authenticated Today at 393 × 852 and desktop using the source state/content, and save a browser-rendered implementation screenshot artifact if the browser surface permits it.
2. Recheck reduced-motion behavior with a controllable emulator or manual device setting.

## Follow-up Polish

- The source Today mock implies trailing chevrons/drill-in affordances and a larger inline progress count; confirm whether the simpler shipped Today rows are intentional.

## Latest availability note

- The user reports the local preview is running on port 4173 and that they are signed in there. The shell and CUA surface available to this QA subagent cannot connect to or enumerate that session, so authenticated evidence could not be captured or verified here.
- No Codex in-app browser surface is currently exposed to this QA subagent. The user’s sign-in is therefore not evidence that can be attached to this report.

final result: blocked
