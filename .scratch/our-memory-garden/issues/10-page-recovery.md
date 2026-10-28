# 10: Recover and delete pages safely

## What to build

Recover earlier page versions and safely delete or restore pages.

## Blocked by

- 04: Build pages with visual blocks and templates
- 08: Manage navigation and page links
- 09: Protect edits and resolve conflicts

## Status

ready-for-agent

## Acceptance criteria

- [ ] Group nearby edits into useful version history and allow restoration.
- [ ] Keep deleted pages in trash until explicitly deleted permanently and restore them as private.
- [ ] Warn about inbound links before deletion and protect the homepage until another is selected.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


Build the user-facing history and restoration experience on the saved-version preservation established by ticket 09; retain grouped version history and existing trash safeguards.

