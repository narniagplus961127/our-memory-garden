# 32 — Navigation actions at the right edge

Status: resolved

Replace navigation Edit/Remove text actions with pencil/trash icon buttons at the right end of each card, including mobile and nested items. Retain explicit accessible names, tooltips, 44 px touch targets, busy states and existing edit/remove/drag behavior. Verify with the existing navigation journeys and visual review; update references, commit and push.

## Verification

The six existing desktop/mobile navigation journeys pass with icon actions. Focused checks after the URL ellipsis refinement pass on both devices, covering native dragging, keyboard moves/cancellation, saved order, submenus, retry and public order. Full-page screenshots interrupted one emulated touch gesture; the test now captures the visible viewport during a drag, preserving the gesture. Product cancellation behavior remains intact. TypeScript, formatting and whitespace checks pass.

Visual review: [desktop](../../../docs/evidence/ticket32/navigation-icons-desktop.png), [mobile](../../../docs/evidence/ticket32/navigation-icons-mobile.png). Full destination URLs remain in the title and edit form. No backend, schema or dependency changes; native FigCraft frames have not been redrawn for this incremental request.

## Answer

Edit and Remove are pencil/trash icon buttons at the right edge of every navigation card. They retain accessible names, tooltips and 44 px targets. The optimized production build passes.
