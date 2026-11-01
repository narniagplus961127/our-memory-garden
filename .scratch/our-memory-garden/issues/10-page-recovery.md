# 10: Recover and delete pages safely

## What to build

Recover earlier page versions and safely delete or restore pages.

## Blocked by

- 04: Build pages with visual blocks and templates
- 08: Manage navigation and page links
- 09: Protect edits and resolve conflicts

## Status

resolved

## Acceptance criteria

- [x] Group nearby edits into useful version history and allow restoration.
- [x] Keep deleted pages in trash until explicitly deleted permanently and restore them as private.
- [x] Warn about inbound links before deletion and protect the homepage until another is selected.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


Build the user-facing history and restoration experience on the saved-version preservation established by ticket 09; retain grouped version history and existing trash safeguards.



## Comments

### Acknowledged revision handoff — 2026-11-01

Post-merge browser validation found that immediate Move to trash after a successful history restore could submit the old page revision while router refresh was pending. The server rejected it safely, but the advertised next action was unnecessarily failing. History recovery now shares the actual page returned by successful restore/trash writes between its sibling controls. A newer acknowledged revision wins until the refreshed server page catches up; original server-side version and homepage guards remain unchanged.

The existing browser recovery journey now deliberately holds only the history RSC refresh response, restores a real saved version and immediately moves the page to trash. It failed with the stale-page error before the fix and passes on desktop and mobile afterward. No click delay, arbitrary sleep or relaxed success assertion masks the race.

## Answer

Implemented authenticated grouped history and read-only exact snapshot review, including title, content, date, category, cover and the merged sharing/indexing settings. Restoration requires explicit confirmation and the current page version. It locks the page, reads only its trusted stored revision and archives the displaced complete row in the same transaction. Current live visibility, stable ID, slug and homepage selection remain unchanged; supported details restore while the current metadata counter advances to reject stale details editors. Historical links to targets deleted since the snapshot remain legitimate restored content.

Pages and the editor expose history/recovery, and Pages exposes Trash. Trash confirmation lists inbound menu, nested text/button, manual-grid and category-grid references. The current homepage cannot be trashed. Trashed pages retain their stable identity; explicit restoration returns them private. A separate irreversible confirmation permanently deletes only an already-trashed current version, cascading its history while retaining other pages and photos. Pending/error states retain the snapshot or trash card and allow retry; list-level success feedback survives card removal.

### Verification

- Before the ticket 12 merge, all 31 affected local HTTP/auth/database/storage service checks passed: 12 concurrency, six media, four organization and nine page-recovery tests. They cover trusted restoration, exact durable preservation, grouping, actor boundaries, one-winner concurrent restores, homepage protection, outsider/cross-origin denial, stale metadata-counter rejection, stable private trash restoration, permanent-delete restrictions, all inbound warnings and real uploaded image/cover/original privacy transitions.
- All 10 final desktop/mobile browser checks passed: eight history/trash journeys and the two existing delayed-initialization editor regressions. Tests cover confirmation, cancel, private restoration, persistent success feedback, anonymous denial and recovery after restore/trash/permanent-delete HTTP failures. Desktop/mobile screenshots were inspected under ignored work/history-desktop.png and work/history-mobile.png.
- An initial post-resume browser probe was interrupted by repeated development Fast Refresh reloads. Failed traces were preserved outside the project. The original launcher, project-local trace output and unchanged readiness assertions all passed after regenerating the resumed development cache; no application behavior or assertion was relaxed. The precise stale-cache trigger could not be reconstructed after regeneration.
- Production build, TypeScript, repository formatting and diff checks passed after browser testing stopped. Ticket 07 and current integration were merged; no new migration was needed. All fixtures used the isolated local database/auth and loopback S3 service; hosted managed-auth/deployment checks remain ticket 13.

### Known limitations

Snapshots preserve this page's data, while linked page grids, category names and media access resolve using current garden state. Exact revisions are retained without pruning. Permanent page deletion intentionally retains photo objects; ticket 11 owns media deletion/retention safeguards and export. No existing archive or media guard is bypassed.


### Ticket 12 integration

Merged current integration including ticket 12. Trusted restoration restores sharing title/description/cover and indexing only when the exact snapshot owns each key. Recorded null values clear overrides and recorded false remains false; older missing keys preserve the locked live sharing settings. Sharing text/boolean/UUID fields are checked and a sharing cover must still be ready under a media share lock. The current metadata counter advances for both legacy and newer snapshots, while live identity, address and visibility remain unchanged.

The new sharing-restoration check first failed because the current sharing title was retained instead of the recorded earlier title, then passed after implementation. Both the newer-snapshot and genuine pre-0012 snapshot checks pass. All 15 combined recovery/discovery API checks pass after integration. No additional migration or client-supplied trusted snapshot was introduced.

Final post-ticket-12 verification: all 10 desktop/mobile recovery/readiness checks, production build, TypeScript and formatting pass after the 15 combined API checks. The refreshed mobile snapshot/settings/confirmation screenshot was inspected. Current integration (eaf9b30) is included, and this final delivery supersedes checkpoint 8be8eec.
