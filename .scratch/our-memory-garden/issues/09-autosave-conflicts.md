# 09: Protect edits and resolve conflicts

## What to build

Make automatic saving dependable and protect work when two administrators edit or connectivity fails.

## Blocked by

- 04: Build pages with visual blocks and templates

## Status

resolved

## Acceptance criteria

- [x] Show saving, saved and failure states; retain unsaved changes and allow retry.
- [x] Preserve simultaneous changes to different blocks and warn on same-block conflicts.
- [x] Make saved changes visible to visitors immediately on public pages.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.

The redesigned editor bar is the visual reference for save and visibility states. Design and verify saving, failure, retry and conflict states; a static Saved label is not evidence of a completed flow.

Connect Puck change events to authenticated persistence with visible saving/failure states. Test concurrent edits and recovery through the running application; Puck's editor state alone does not provide the specified persistence or conflict guarantees.

Preserve unsaved edits across refresh/closure on the same device when possible; clearly mark recovered work unsaved until persistence succeeds. Clear device recovery copies after successful saving or sign-out. For simultaneous same-block text edits, offer the second editor their local text and saved version, allowing them to keep local, accept saved, or copy and edit manually; preserve the saved version in page history before replacing it. Conflicting moves or deletion of the same block require a choice and preservation of unsaved work; apply independent changes when safe.

This ticket must durably preserve the previously saved version before resolving an overwrite; it may introduce the minimum history storage needed for that guarantee. Ticket 10 adds the user-facing history and restoration experience. Ticket 09 must not depend on ticket 10, which already depends on ticket 09.

## Answer

Implemented authenticated trusted-revision saving with recursive block-ID merging, scoped layout choices, side-by-side text comparison and keep/local/saved/manual resolution. Cached title or public visibility cannot overwrite independent changes during a text resolution. Every displaced saved row is archived atomically; an archive failure rolls back the save. Adjacent saves retain exact revisions while carrying useful display-group metadata for ticket 10.

Device recovery is versioned and scoped by administrator, page and tab. It retains offline/failed edits, manual comparison text, unfinished link values and unresolved in-flight conflicts through refresh. A closed tab's copy requires an explicit recovery choice. Acknowledgement clears only the acknowledged unchanged copies; sign-out stops callbacks and clears account copies across tabs. Invalid destinations remain inactive and cannot pass server validation.

The editor waits for client/Puck/autosave initialization before enabling controls. A deterministic test holding client scripts reproduced the prior lost-selection problem, then passed on desktop and mobile after the fix. The original selection/reload reproducer also passed 10 consecutive trials against the fixed application.

Detailed storage/API/history contracts and ticket 10 handoff: [Concurrency and recovery](../../../docs/concurrency.md).

### Verification

- All 30 local authenticated API/database checks passed, including simultaneous accepted writes, nested independent edits, privacy/title-safe conflict resolution, retries with lost responses, missing-base rejection, exact history grouping, archive-failure rollback, deleted-parent moves and independent insertion preservation during a contested subtree deletion.
- Desktop/mobile tests passed for delayed initialization and unfinished/unsafe URL recovery. All 16 targeted post-merge journeys passed after the native mobile menu test locator was corrected: homepage visibility, media reuse, galleries, sign-out/late callbacks, both layout choices, in-flight conflict recovery and slow-save retry.
- The earlier broad browser run reported 48 passes, one intentional mobile drag skip and three failures. The exact failed journeys subsequently passed; the selection failure was reproduced and fixed rather than dismissed. The cold development homepage timeout did not reproduce in the targeted desktop/mobile runs.
- Production build, TypeScript and repository formatting checks passed after browser services stopped. Tickets 05, 06 and 08 are merged. Desktop/mobile conflict screenshots were inspected in ignored work/ticket09-evidence/.
- Local fixtures only. Hosted authentication/deployment verification remains ticket 13.

### Known limitations

Same-slot simultaneous insertions or reorders can conservatively require a layout choice. Non-slot properties are merged atomically per block, so two different property edits on one block may require comparison. Unusual incompatible placement graphs require an explicit whole-layout choice. Device recovery depends on available browser storage and a one-million-character record bound; failures are disclosed and in-memory retry remains available. Exact historical snapshots are retained without pruning. Ticket 10 adds history/trash interfaces and restoration.
