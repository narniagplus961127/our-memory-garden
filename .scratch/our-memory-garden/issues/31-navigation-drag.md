# 31 — Drag navigation items to reorder

Status: resolved

Replace navigation menu up/down buttons with labelled drag handles. Support mouse, touch and keyboard pickup/move/drop/cancel; show insertion feedback. Reorder siblings while preserving the parent and its children; Parent item remains the nesting control. Preserve autosave, private-page filtering, retry and version-conflict handling. Verify desktop/mobile persistence, cancellation, nesting, failure/retry and public order. Update references, commit and push the completed ticket.

## Verification

Six desktop/mobile browser cases pass. Real mouse and touch gestures reorder root items and submenu siblings, preserve children/parents, cancel without a write, retain keyboard focus, persist through reload, keep failed local ordering for retry and render the resulting public order. Existing navigation editing/reparenting, address changes, private links and invalid addresses still pass. TypeScript, Prettier and whitespace checks pass. The first test run used an incorrect public-list selector; fixing that test resolved the failure without a product workaround.

The optimized Next.js production build passes. Visual review confirms the insertion line, floating label and compact mobile action labels.

## Limits

Dragging changes sibling order; use Parent item to change nesting. Existing backend validation, conflict detection, IDs, destinations and private-page filtering remain in use. No dependency or schema change. Native FigCraft frames have not been redrawn for this incremental request; the application, spec and design-state reference record the current behavior.

## Answer

Navigation uses accessible grip buttons for mouse/touch dragging and keyboard reordering. Drop saves the order once; Escape or touch cancellation leaves it unchanged. Up/down buttons are removed from navigation. Compact Edit/Remove actions retain explicit accessible names.
