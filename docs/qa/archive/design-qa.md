# daisyUI Cupcake UI kit QA

**Findings**

- [P1] A pixel-for-pixel parity verdict cannot be made from the available comparison views.
  Location: daisyUI Theme Generator `Components Demo` versus the internal `/ui-kit` gallery.
  Evidence: the source capture is the full Theme Generator composition (navigation, product cards, charts, imagery and iconography), while the implementation intentionally renders reusable component shells rather than copying those demo compositions. The plan explicitly excludes copying the demo content.
  Impact: a full-page pixel diff would measure different layouts and assets rather than the reusable primitives it is meant to validate.
  Fix: capture a source and implementation crop for each corresponding primitive and state (including hover, focus, pressed, checked, disabled and loading), then run a normalized component-level visual diff.

**Open Questions**

- The source has real image assets and iconography in its demos. They are intentionally out of scope for the reusable React Native primitives, which accept `ReactNode` media instead.

**Implementation Checklist**

- [x] Captured source visual truth: https://daisyui.com/theme-generator/?theme=cupcake (v5.7.28, browser capture at 1280 CSS px wide).
- [x] Captured implementation preview: http://127.0.0.1:8088/ui-kit (browser capture at 390, 768 and 1280 CSS px wide; device scale factor 1).
- [x] Exercised a checkbox and `Details` tab; verified selected/checked accessibility state.
- [x] Checked the implementation browser console: no errors.
- [x] Re-ran format, lint, typecheck, Jest and Web export after the radial-progress revision.
- [ ] Produce like-for-like component crops and resolve any remaining visual deltas before asserting pixel-perfect parity.

**Follow-up Polish**

- Capture a real fine-pointer hover and `prefers-reduced-motion` state in the component-level diff set.

## Comparison evidence

- Source visual truth path: `https://daisyui.com/theme-generator/?theme=cupcake`
- Implementation preview / screenshot source: `http://127.0.0.1:8088/ui-kit` (browser-rendered capture in this task session; local preview is available only while the local server is running)
- Viewports: 390×844, 768×900 and 1280×900 CSS px; density normalization: device scale factor 1, no resampling.
- State: Cupcake light theme; default gallery state plus checked checkbox and selected `Details` tab.
- Full-view comparison: source full Theme Generator and implementation gallery were browser-captured. Their composition differs by design, so this is contextual evidence only.
- Focused region comparison: blocked until matching source/component crops are captured; the full view is insufficient for typography, exact spacing and interaction timing.

## Comparison history

1. The initial implementation used a partial border ring for `RadialProgress`; this was a P2 fidelity issue.
   - Fix: replaced it with a Web conic-gradient ring and preserved a native-compatible fallback surface.
   - Post-fix evidence: successful format, lint, typecheck, Jest and Web export. A post-fix browser capture could not be retained because the browser URL policy subsequently blocked the local preview reload.

final result: blocked
