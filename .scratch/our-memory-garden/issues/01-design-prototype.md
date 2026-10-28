# 01: Design and approve the Figcraft prototype

## What to build

Create a clickable desktop and mobile Figcraft prototype reflecting the agreed botanical journal direction, and obtain owner approval before development.

## Blocked by

- 00: Validate the Puck editor during design

## Status

ready-for-human

## Acceptance criteria

- [x] Show public homepage, page, gallery, login, dashboard and editor with mobile and desktop layouts.
- [x] Demonstrate browsing, signing in, creating a private page from a template, editing blocks and making it public, including visibility and save states.
- [ ] Use sample content, soft colors, garden motifs and animals; review the prototype and record owner approval.


## Design revision — Sunlit Garden

Redesigned the desktop and mobile homepages with full-width photography, a warmer palette, and open page entries. Added a separate General styles & brand page with 12 named styles, reusable buttons, width guidance, logo, and favicon. Updated colors and branding across existing prototype screens. Rendered the homepage and style guide and checked prototype destinations. Owner design approval is still pending.


## Admin screen reference

The prototype now includes desktop and mobile overview, pages, media library, navigation and settings screens, plus a mobile admin menu. Review these screens and their detailed flows before approval.


The editor now shows desktop and mobile content palettes, page canvas, a selected-text settings state, visibility and save status. Review the states and design missing error, drag/drop, canvas device-view and responsive-panel interactions before final approval.

## Review handoff — 2026-10-28

Ticket 00 is resolved and owner accepted. The native FigCraft document now contains 51 separate screens across five grouped pages. Added desktop/mobile saving, saved-edit, failure/retry, conflicting-text comparison, generic not-found and password-reset designs; added mobile public navigation, context-preserving admin-menu close and an editable line-art cat motif. Corrected palette, navigation-label and editor status review links.

The acceptance flow is illustrated with linked sample screens; arbitrary editing, dragging, nested layouts and device-width switching belong to the owner-accepted working Puck experiment. The native graph audit verified 284 navigation actions with no missing destinations and both core desktop/mobile routes. Player spot checks and selected mobile renders were reviewed. Full evidence, routes and later-ticket design work are in `docs/design-spec-review.md`.

Status remains ready-for-human because the final criterion includes owner approval. Approve the overall visual direction and core editor flow before ticket 02 begins. Later-ticket states listed in the review must be refined before implementing their respective interactions; no production application has been started.


