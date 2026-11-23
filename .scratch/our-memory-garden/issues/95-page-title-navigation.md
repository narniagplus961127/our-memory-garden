# 95 — Protect page-title navigation from pending searches

Status: resolved

Apply the page-list search/navigation protection to title links as well as the three-dot actions. Pending results must not pull an administrator away from a chosen editor. Keep normal new-tab modifier behaviour and keyboard navigation when results settle.

## Answer

Page-title links use the same pending-results lock as row actions and cancel any queued search on same-tab navigation. Settled links retain normal Next Link modifier behaviour. A real desktop/mobile browser journey deliberately holds the search response, verifies keyboard activation stays on the list while locked, releases the response, then opens the correct editor. TypeScript checks pass; the shared reliability test file is delivered with tickets 94, 96 and 97.
