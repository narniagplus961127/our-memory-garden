# 25 — Category management and creation-time page URLs

Status: resolved

## Request

Add a Categories administration menu. Generate the new-page URL from its title (Our Day → our-day), allow editing before creation, and show an error for duplicates. Remove repeated History and recovery links from the Pages list; retain the page editor's History entry.

## Acceptance

- Provide authenticated desktop/mobile Categories navigation and a dedicated create/rename screen using the existing shared category API and conflict validation.
- The new-page form keeps the URL in sync with its title until manually edited; a Use title action restores this behaviour. Show the `/garden/` prefix, address rules and field-specific errors, retaining entered values after failure.
- Create the page with its chosen address atomically. Duplicate URLs, including reserved addresses in trash, fail without creating a page. Keep stable page-ID links and existing-page address editing intact.
- Keep older API clients that omit an address compatible with generated ID-based addresses; the website form always supplies its title-derived or edited address.
- Update specification and design notes, verify authenticated journeys and duplicate/race handling, then commit and push.

## Verification

- All six desktop/mobile scenarios pass across the complete run and the final two creation rechecks: generated/custom/reset URLs, duplicate error recovery without extra pages, shared category rename/assignment, invalid URLs, concurrent duplicate creation, trash-reserved URLs and administrator access.
- Eight existing organization/discovery API checks pass, including category grids, address changes and public/private cover access. The two media checks were rerun with the required local S3 fixture after an initial connection-refused setup failure.
- TypeScript, Prettier and production build pass. No schema migration or production-content changes.
- Browser inspection confirms matching title/URL widths, the visible `/garden/` prefix, dedicated Categories navigation and the create/rename layout.

## Answer

Added the Categories administration screen, title-derived editable creation URLs and atomic duplicate validation. Removed the repeated Pages-card history links, keeping History inside the editor. Existing category assignment, legacy API creation and stable page-ID links remain compatible.
