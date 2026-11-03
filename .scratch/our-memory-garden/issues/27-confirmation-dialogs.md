# 27 — Popup confirmations and editor notifications

Status: resolved

## Request

Use centred popups for confirmations such as Move to trash, and non-blocking toasts for short editor errors/info messages.

## Acceptance

- Move trash, private restoration, permanent deletion and version-restoration confirmations into responsive native modal dialogs. Keep existing warnings, inbound references and explicit confirmation actions.
- Focus Cancel initially; support Escape and focus return. Keep in-flight requests protected against dismissal or duplicate actions. Failures stay in the popup with retry/reload actions.
- Show editor save errors as persistent, actionable toasts without moving the canvas. Use dismissible, timed toasts for short editor notices. Keep recovery/conflict decisions and the save-state indicator available until resolved.
- Verify desktop/mobile confirmation, cancel, retry and layout behaviour; update docs and push the completed ticket.

## Verification

All ten existing desktop/mobile recovery cases pass. Four focused popup/toast cases pass after fixing focus return: centered geometry, Cancel/Escape, keyboard focus, in-flight locking, stable canvas during a failed save, retry and notice removal. TypeScript, Prettier and optimized build pass. No data/schema changes. [Desktop](../../../docs/evidence/ticket27/popup-desktop.png), [mobile](../../../docs/evidence/ticket27/popup-mobile.png).

## Answer

Recovery confirmations use a shared native modal. Editor save errors use a persistent actionable toast; short manual-edit notices use a dismissible timed toast. Existing conflict/recovery choices remain available until resolved.
