# 08: Manage navigation and page links

## What to build

Manage menus and text links that connect garden pages and external sites.

## Blocked by

- 03: Publish a page and edit the homepage
- 04: Build pages with visual blocks and templates

## Status

resolved

## Acceptance criteria

- [x] Create and reorder menu items, including nested items and internal or external links.
- [x] Choose internal pages in text links and keep references working when page addresses change.
- [x] Remove old addresses on change; hide private pages from public menus while visible text links lead visitors to not found.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


## Admin screen reference

Follow the Navigation screen and the mobile admin menu for the menu-management entry point.


## Comments

### Implementation — 2026-10-29

Added versioned, ordered navigation with garden-page or safe external destinations, nested parents, sibling move controls, editing/reparenting and removal. The server rejects cycles, missing parents, new unavailable page references, unsafe URLs, stale menu versions and unauthorized/cross-origin writes. Public desktop and mobile menus share the same filtered tree; private/trashed targets and their nested children are excluded. Existing references to later-unavailable pages remain manageable without preventing unrelated menu edits.

Page details now edits the unique slug with automatic saving, inline invalid/duplicate errors, retained entered values and the old-address warning. The canonical route is /garden/[slug]. An address change replaces pages.slug using the expected previous slug, leaves content/version saves independent, and makes the previous address not found. Stable /p/[id] resolves the current canonical address after applying the same access rules. Text and button settings share a page-ID/external-URL picker; private-target text remains visible and leads anonymous visitors to not found. Existing external href button documents continue to render and edit correctly.

Validation: all 10 API/service checks passed in local development; the four navigation checks also passed after the final request-time header changes. Four new desktop/mobile browser journeys passed, covering menu create/reorder/reparent/remove, address changes, phrase/button destinations and invalid/duplicate address feedback. The affected editor regression run passed 12 journeys with the intentional mobile drag skip; its existing mobile final-selection-after-refresh case failed once and passed on an isolated rerun. This matches the intermittent selection issue already recorded in ticket 04 and was handed to ticket 09. Build, typecheck and formatting passed. Mobile menu/admin/address renders were inspected; menu evidence is in the task artifacts under ticket08-navigation.

Known limits: each Text block supports one linked phrase (the first matching occurrence); use separate Text blocks for additional links. The /p/[id] sharing/resolver route intentionally stays stable, while old meaningful /garden/[slug] addresses stop working. Address edits are separate from content versions. Tests use the prepared local PostgreSQL/Better Auth fixture. Production-mode local authentication remains intentionally disabled; a reversible local SQL setup and HTTP assertions verified homepage/account/not-found menu freshness on the production build without bypassing that guard. Hosted Neon authentication and deployment verification remain in ticket 13. The trash transition test uses local database fixture setup until ticket 10 exposes the trash action.

Apply db/migrations/0008-navigation.sql through the checked-in migration runner before hosting this slice. No hosted schema was changed by this ticket.

## Answer

Navigation and text/button destinations now retain stable page IDs across editable address changes. Public menus filter unavailable pages on the server, and old canonical addresses stop resolving. See docs/implementation-notes.md and tests/browser/navigation.spec.ts.
