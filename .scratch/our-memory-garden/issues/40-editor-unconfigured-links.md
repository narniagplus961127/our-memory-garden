# 40 — Compact confirmations and unfinished editor links

Status: resolved

The owner reported an empty band between confirmation text and actions, and an unfinished Button page destination causing an Invalid page content save-error toast. Remove empty modal body spacing without hiding meaningful confirmation content/errors. Treat empty optional editor destinations as inactive links so other page edits continue saving without a toast. Show neutral guidance for empty choices; preserve validation/recovery for non-empty malformed or unsafe addresses. Never output an unsafe/empty active link. Keep valid internal page-ID and external URL behavior, mobile usability and real save-failure retry. Verify actual editor and public rendering before pushing/releasing.

## Answer

The exact desktop repro failed before the fix: selecting Garden page without a target left autosave at Not saved, and the simple removal dialog reserved an empty 48 px band. Modal now omits an absent body, keeping a single action divider; shared confirmations have a 560 px maximum width. Real warnings and retry errors retain their body, focus handling and scrolling.

Empty page/external optional destinations are valid inactive saved states. New buttons start without a sample URL, and the picker offers No link plus neutral guidance for empty choices. Configured internal/external links activate normally; clearing them removes the link. Inactive buttons render as noninteractive spans. Explicit null means No link and suppresses legacy href fallback. The Button destination field reads selected legacy data reactively because Puck memoizes custom field renderers; existing valid addresses remain visible/configurable rather than relying on a stale resolveFields closure.

Known unfinished/unsafe web-address fields stay local, recoverable and Not saved, with inline guidance. Autosave does not send a known-invalid request or create a generic Invalid page content toast for that field state. Finishing or clearing the address resumes normal saving. Actual connection/server failures retain their error toast and Retry save. Server validation still rejects malformed/unsafe non-empty addresses, malformed/missing page IDs and incomplete required Navigation items.

## Verification and limits

Six final desktop/mobile optional-link, recovery and compact-confirmation journeys pass, including title edits beside an empty link, reload persistence, valid/cleared destinations, legacy No link, unsafe-address recovery and no active public link. Eighteen existing shared-dialog/history/trash/shortcut checks pass, and both held-write/failed-save retry journeys pass. All eight block/navigation API checks pass. TypeScript, formatting, whitespace and optimized production build pass. No schema migration or dependency change is needed.

The link regression edits the page title to isolate link persistence from mobile contenteditable fill timing; this ticket does not change inline writing. Non-empty malformed addresses must be corrected or cleared before their local page changes can finish saving; empty optional destinations save normally. Native FigCraft frames are not redrawn for this requested refinement.

Evidence: [compact desktop](../../../docs/evidence/ticket40/compact-confirmation-desktop.png), [mobile](../../../docs/evidence/ticket40/compact-confirmation-mobile.png), [optional link desktop](../../../docs/evidence/ticket40/optional-link-desktop.png), [mobile](../../../docs/evidence/ticket40/optional-link-mobile.png).
