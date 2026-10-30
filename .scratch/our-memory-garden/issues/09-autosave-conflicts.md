# 09: Protect edits and resolve conflicts

## What to build

Make automatic saving dependable and protect work when two administrators edit or connectivity fails.

## Blocked by

- 04: Build pages with visual blocks and templates

## Status

claimed

## Acceptance criteria

- [ ] Show saving, saved and failure states; retain unsaved changes and allow retry.
- [ ] Preserve simultaneous changes to different blocks and warn on same-block conflicts.
- [ ] Make saved changes visible to visitors immediately on public pages.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


The redesigned editor bar is the visual reference for save and visibility states. Design and verify saving, failure, retry and conflict states; a static Saved label is not evidence of a completed flow.


Connect Puck change events to authenticated persistence with visible saving/failure states. Test concurrent edits and recovery through the running application; Puck's editor state alone does not provide the specified persistence or conflict guarantees.


Preserve unsaved edits across refresh/closure on the same device when possible; clearly mark recovered work unsaved until persistence succeeds. Clear device recovery copies after successful saving or sign-out. For simultaneous same-block text edits, offer the second editor their local text and saved version, allowing them to keep local, accept saved, or copy and edit manually; preserve the saved version in page history before replacing it. Conflicting moves or deletion of the same block require a choice and preservation of unsaved work; apply independent changes when safe.


This ticket must durably preserve the previously saved version before resolving an overwrite; it may introduce the minimum history storage needed for that guarantee. Ticket 10 adds the user-facing history and restoration experience. Ticket 09 must not depend on ticket 10, which already depends on ticket 09.


