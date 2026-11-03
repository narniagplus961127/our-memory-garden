# 17 — Text appearance, block spacing and grab targets

Status: resolved

## Request

Make block cards feel draggable rather than text-selectable. Add text colour, font size and letter spacing, plus independent top/right/bottom/left padding and margin. Review the editor on desktop and mobile for clear, usable controls.

## Acceptance

- Palette card surfaces show grab/grabbing and do not select their labels. Dedicated canvas block handles remain draggable; editable text remains selectable.
- Inline selected words support custom hex/picker colour, font size (8–120 px), letter spacing (−2–20 px), and a reset to inherited appearance. Opening controls preserves the selected range.
- Every block supports independent nonnegative 0–120 px padding and margin on all four sides. Blank sides inherit existing defaults, including legacy all-side padding.
- Autosave, reload and the public renderer preserve appearance. Server validation rejects unapproved CSS and invalid spacing.
- Toolbar space remains reserved, panels remain scrollable, mobile does not overflow horizontally, and touch/keyboard movement alternatives remain available.

## Verification

- All 14 existing desktop/mobile inline, composition, autosave/conflict and stable-dialog cases pass.
- Extended inline appearance checks pass on both devices: size edited then colour dialog opened directly, custom colour applied to the retained range, letter spacing applied, numeric Escape cancelled, spacing saved/reloaded and anonymously rendered. Resetting side overrides restores legacy 30 px all-side padding. The renderer uses individual longhands to avoid React shorthand/longhand reset conflicts.
- Native palette drag and nested block movement regression passes, including non-selectable card surface with grab cursor and self-drop rejection. The existing test was updated for the explicit “Drag block” accessible name.
- All three block API tests pass, including round-trip public styles, invalid CSS rejection and invalid/unknown/negative/out-of-range spacing rejection.
- TypeScript, Prettier and optimized production build pass.
- Manual local-fixture review at 1280×720 and 390×844 confirms centred colour dialog, invalid-colour blocking, eight independent side values, margin reset and no page-wide mobile overflow (document width 390 px). “bloom” alone changes size while preceding words retain their size.

## Delivery

The spec and interaction-design document record this owner-requested refinement. No database migration or dependency additions. Native FigCraft frames were not redrawn; the latest implementation evidence and updated interaction notes supersede their basic-formatting controls for ticket 17. OS-native picker appearance and physical touch dragging depend on the device; tap/keyboard movement alternatives remain available.

- [Desktop editor](../../../docs/evidence/ticket17/editor-desktop.png)
- [Mobile text colour](../../../docs/evidence/ticket17/text-colour-mobile.png)
- [Mobile spacing](../../../docs/evidence/ticket17/spacing-mobile.png)
