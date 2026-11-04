# 34 — Navigation form pages and removal confirmation

Status: resolved

Move menu creation and editing from the right-hand form to dedicated authenticated pages, with Back/Cancel returning to Navigation. Keep the list full width with existing drag handles and right-edge action icons. Removing an item opens the shared centred confirmation dialog, including its nested-item count; Cancel/Escape make no change. Confirmed removal preserves linked pages, locks in-flight actions and retains errors/retry without optimistically hiding rows.

Preserve labels, destinations, nesting, sibling order, server validation and concurrency protection. Forms retain input on failure, avoid duplicate creation on retry and return to a fresh list after success. Verify desktop/mobile routes, cancel/focus, deletion retry/concurrent changes, form persistence and existing drag behavior. Update references, commit and push.

## Answer

Navigation now has a full-width list and dedicated authenticated create/edit pages. Add menu item and the pencil icon open the relevant form; Back/Cancel return without saving, and successful submission returns to the refreshed list. Existing destination and parent controls remain. A failed save retains inputs. Forms merge against the latest menu, preserving unrelated edits, requiring review for changes to the same item and recognizing a previously successful creation after a lost response.

The trash icon opens the shared centred confirmation popup naming the item and counting every descendant menu item. Cancel/Escape leave the menu unchanged and return focus to the trigger. Confirmation keeps rows visible until saved, prevents repeated submission/dismissal while pending, keeps failures and retry inside the popup, and offers Review saved menu after a concurrent change. Removal affects menu items only; linked pages/content remain. Dragging and the right-edge pencil/trash controls are preserved.

## Verification

Ten relevant desktop/mobile browser journeys pass: six new form/confirmation/access checks plus four existing drag/nested-navigation journeys. Coverage includes Cancel/Escape and focus return, delayed and failed removals, descendant counts, version conflicts, safe reload, retained form input, interrupted success responses without duplicate creation, independent concurrent edits, same-item review, authenticated routes, missing items, responsive layout, mouse/touch/keyboard dragging and public navigation after address changes. PostgreSQL and local administrator fixtures back these checks; production credentials/data were not modified.

TypeScript, full Prettier/whitespace checks and the optimized Next.js build pass. The build includes both new form routes. React review confirms server authentication before data access, labelled native fields/actions, guarded requests and preserved error states. No schema changes or new dependencies.

## Design and evidence

- [Create: desktop](../../../docs/evidence/ticket34/navigation-create-desktop.png), [mobile](../../../docs/evidence/ticket34/navigation-create-mobile.png).
- [Edit: desktop](../../../docs/evidence/ticket34/navigation-edit-desktop.png), [mobile](../../../docs/evidence/ticket34/navigation-edit-mobile.png).
- [Confirmation: desktop](../../../docs/evidence/ticket34/navigation-confirm-removal-desktop.png), [mobile](../../../docs/evidence/ticket34/navigation-confirm-removal-mobile.png).
- [List: desktop](../../../docs/evidence/ticket34/navigation-list-desktop.png), [mobile](../../../docs/evidence/ticket34/navigation-list-mobile.png).

The spec and application design-state reference are updated. Native FigCraft frames have not been redrawn for this incremental owner-requested change; screenshots document the implemented states. Authenticated end-to-end verification used the local test environment; production verification is limited to release/health and anonymous route protection.
