# 12: Control public-page discovery

## What to build

Control how public pages appear to search engines and when shared.

## Blocked by

- 03: Publish a page and edit the homepage
- 07: Organize and display pages

## Status

resolved

## Acceptance criteria

- [x] Edit page title, description, cover image and per-page search-indexing choice.
- [x] Expose sharing information for public pages while keeping private pages inaccessible and out of public discovery.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.

## Answer

Implemented the approved Search and sharing controls within Page details: optional sharing title, description and ready-library cover overrides, plus a per-page indexing choice. The public title/cover fall back to page title/cover. The existing metadata-version compare-and-swap saver, conflict comparison and account/page/tab recovery copy now cover these fields. Missing sharing fields in older API payloads remain unchanged; missing fields in older recovery copies default on both base and draft from the current authenticated page.

Public pages dynamically emit description, OpenGraph, Twitter, canonical and indexing metadata. The homepage has one root canonical, while other pages retain meaningful garden addresses, stable ID redirects and old-address not-found behavior. The current sitemap includes only live public indexable pages. Robots lists general administrative paths without exposing private addresses. Private pages remain anonymous not-found and authenticated private views expose no sharing metadata. Indexing never grants access or makes a public page private.

Migration0012 adds the sharing columns and preserves all exact media scanner keys, nested galleries and covers. A sharing-cover-only public reference grants protected display access; removing the final live public use or hiding/trashing its page revokes subsequent anonymous access. Historical references retain media without granting public access, and originals remain administrator-only. Photo checks use shared row locks compatible with ticket11's deletion guard.

### Verification

- Four final HTTP/API discovery checks passed: current HTML metadata/robots/indexing, private metadata isolation, sharing-cover and page-cover fallback, ready-photo validation, live media privacy transitions, homepage canonical rules, stable references, old-address removal and trash filtering. Tests use the isolated local database/auth/S3 services.
- Twelve concurrency and four organization API checks passed, preserving exact saved revisions, independent content edits and organization/media access. Discovery checks were rerun after their final cover/trash assertions.
- All sixteen affected desktop/mobile journeys passed across the combined run and final targeted reruns: sharing ready-photo picker, save/reload, offline refresh/retry, legacy device-copy compatibility, ordinary organization/category/media controls, two-admin details conflicts, per-tab recovery, sign-out and grids. The initial desktop picker-name ambiguity was corrected with distinct accessible sharing-cover labels; both affected device journeys then passed.
- TypeScript, repository formatting and production build passed. Build output confirms root, garden, sitemap and robots routes are dynamic. Desktop/mobile sharing screenshots were inspected under ignored work/discovery-*.png. The React review checked labelled/disabled controls, 44 px indexing target, bounded recovery, serializable fields and protected gateway references.
- Based on integration/our-memory-garden at121d8bc; migration0012 applied only to garden_ticket12. Ticket10 history restoration must restore keys present in its trusted snapshot and retain live values when an older snapshot lacks a sharing key; that coordinated extension is owned by the subsequently integrated history ticket.

### Known limits

Hosted managed-auth/browser deployment and applying pending hosted migrations remain ticket13. Browser storage may be unavailable; the existing recovery warning retains in-memory retry. External search/social caches can retain previously fetched information, and downloaded public bytes cannot be recalled. Application metadata and access decisions reflect current settings on each request.
