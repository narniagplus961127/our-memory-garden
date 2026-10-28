# 03: Publish a page and edit the homepage

## What to build

Administrators can change page visibility and edit the always-public homepage; visitors see saved public content.

## Blocked by

- 02: Create and view a private page

## Status

resolved

## Acceptance criteria

- [x] Switch a page between public and private and enforce access when its state changes.
- [x] Edit the homepage as a page and display saved content publicly.
- [x] Keep the homepage public and ensure both administrators can access private pages.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


## Settings design reference

Use the Homepage settings screen for selecting a public page as the homepage and retaining deletion protection.


This slice establishes page visibility and the always-public homepage using the editing capability available after ticket 02. The shared Puck block editor for the homepage arrives in ticket 04; do not assume photo uploads or galleries exist here.

## Comments

### Implementation — 2026-10-29

The editor now changes page visibility through authenticated, version-checked automatic saving. Anonymous page/API reads immediately follow the saved state, while both administrators retain private access. Text and visibility can be saved together without dropping either change.

The homepage is selected through the existing approved Homepage settings design and edited through the ordinary page editor. The first authenticated administrator visit initializes a normal public homepage if none exists. Database triggers reject selecting a private/trashed page, hiding/trashing/deleting the active homepage, or removing its setting. Selecting another public page releases the previous page from that protection. Public responses remain dynamic and uncached.

Local verification: eight desktop/mobile browser journeys and five API/database tests passed, including public/private transitions, both-administrator access, homepage text appearing immediately at `/`, and database protection against hiding, trash and deletion. These checks use the isolated local PostgreSQL/Better Auth setup. The checked-in `0002-homepage.sql` migration has not been applied to hosted Neon by this ticket; deployment verification and the owner's managed sign-in remain in ticket 13. The homepage picker uses approved frame 955/959 components; no new FigCraft screen was needed.

## Answer

Page visibility and an editable, always-public homepage are implemented. The same basic auto-saving editor serves ordinary pages and the homepage, ready for replacement by the shared Puck editor in ticket 04. See `docs/implementation-notes.md` and `tests/service/visibility.test.mjs` for the handoff.
