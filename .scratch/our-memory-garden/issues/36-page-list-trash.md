# 36 — Move page trash action to the Pages list

Status: resolved

Place a 44 px bin icon at the right end of every Pages-list card, with an accessible name and homepage protection. Move the active-page trash action out of History; retain restore/permanent-delete actions for trashed pages. Reuse the confirmation popup, inbound-link warnings, version guard and retry behavior. Fetch references only when opening the action and never show a false empty-reference result after a load failure. Keep cards until a successful mutation, refresh the list, show a success toast and retain a useful focus target. Verify desktop/mobile, cancellation, failures and existing recovery.

## Answer

Pages cards now have a right-edge bin icon outside their editor link. The homepage action stays disabled with an explanatory tooltip. Confirmation loads current inbound links on demand; loading can be cancelled, lookup failures require retry, and destructive requests retain existing confirmation/version checks. A failed request keeps the card and popup; success refreshes the list, shows a toast and focuses Pages. Active History no longer offers Move to trash; trashed-page History and Trash retain recovery/deletion. Overview cards remain simple links. Client cards receive only their small metadata summary, without page content.

## Verification

Fourteen desktop/mobile recovery journeys pass, covering icon size/right inset/centering with long titles, no horizontal overflow, link lookup failure/retry, inbound menu warnings, Cancel/Escape/focus, pending requests, concurrent page edits, removal refresh/toast, homepage protection, restoration, permanent-delete retry and anonymous access. TypeScript and formatting checks pass; no dependencies/schema/API changes. Application evidence: [Pages desktop](../../../docs/evidence/ticket36/page-list-bin-desktop.png), [mobile](../../../docs/evidence/ticket36/page-list-bin-mobile.png), [confirmation desktop](../../../docs/evidence/ticket36/page-trash-links-desktop.png), [mobile](../../../docs/evidence/ticket36/page-trash-links-mobile.png). Spec/design-state references are updated; native FigCraft frames are not redrawn for this increment. Authenticated verification uses local fixtures.
