# 07: Organize and display pages

## What to build

Organize pages with optional details and display selected pages in editable grids.

## Blocked by

- 03: Publish a page and edit the homepage
- 04: Build pages with visual blocks and templates
- 05: Upload and use photos securely

## Status

resolved

## Acceptance criteria

- [x] Assign optional date, category and cover photo; create and rename categories.
- [x] Add a grid that selects pages manually or by category.
- [x] Hide private pages from visitors while allowing administrators to see them.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


The redesigned editor palette includes this block; follow the approved editor canvas and contextual settings design when adding its controls.

## Answer

Implemented optional page dates, categories and ready cover photos in the approved Page details controls. Administrators can create and rename shared categories without changing their identifiers. Details use their own compare-and-swap version while advancing the ordinary page revision, preserving exact history bases and independent content edits.

The Page grid block supports ordered manual page IDs or a category, optional dates, nested layouts and actual desktop/mobile canvas widths. Public rendering and the editor share the same card component and server-filtered data boundary. Private/trashed pages are excluded for visitors. Cover-only public use grants display access; hiding that page or removing its final reference revokes subsequent anonymous display requests.

Bounded account/page/session device copies retain failed and unfinished details before the debounce. Refresh restores the current tab's unsaved details; other copies require explicit recovery. Separate tab copies survive each other's acknowledgement. Independent metadata changes merge; contested values require a choice. Shared sign-out clears account recovery before late callbacks can rewrite it. Ticket 06 galleries and ticket 09 readiness, incomplete-input recovery and trusted revisions remain integrated.

### Verification

- Four local API/service checks passed: category/detail persistence and authorization, ready-photo validation, nested manual/category visibility filtering, cover-only media transitions and metadata revisions followed by stale independent content saves.
- All twelve desktop/mobile organization journeys verified, including the real cover picker, category rename, refresh/retry, two-admin conflicts, separate tab copies, late-response sign-out, manual ordering/category grids, visitor privacy and real 1280/390 px iframe responsiveness. The combined run passed eleven; the native mobile menu lookup was corrected to its label and that targeted journey passed.
- TypeScript, repository formatting and production build passed. Desktop/mobile details and public grid screenshots were inspected under ignored work/ticket07-evidence/.
- Merged integration/our-memory-garden through be49624, preserving Gallery, stable destinations and shared recovery/history. New migration: db/migrations/0007-organization.sql; applied only to the isolated local garden_ticket07 database.

### Known limits

Hosted managed-auth/browser deployment and applying pending hosted migrations remain ticket 13. Device recovery depends on available browser storage; the editor discloses storage failure and retains changes in the open panel. Previously downloaded public photo bytes cannot be recalled.
