# 110 — Change existing Paper page sections to Transparent

Status: resolved

Apply the user's requested content update to all current pages listed at `/admin/pages`, including the homepage and private pages. Change only Section blocks whose `props.background` is `paper` to `transparent`, including nested sections if present. Keep other section colours, custom colours, photos, text, templates, trashed pages and prior history unchanged. Use the existing revision trigger so the previous saved pages remain recoverable. No application deployment is needed.

## Answer

Applied on 2026-11-25 to the verified `production` branch of Our Memory Garden, database `garden`. Changed 76 Section background settings across 15 current pages from `paper` to `transparent`. All affected pages were public at execution time. Templates and trash were outside the update scope.

The operation used a single transaction with row locks, a 5-second lock timeout and a 30-second statement timeout. A temporary recursive transform changed only objects with `type: Section` and `props.background: paper`. Before applying, a dry run verified nested sections, ordered arrays, unchanged Banner/Text values and custom/Sage colours. A fingerprint of the reviewed page snapshots prevented applying over intervening edits.

The normal revision trigger archived each complete prior page and incremented its version once. Post-update assertions checked exact transformed content, unchanged unrelated page fields and exact prior snapshots in history; any mismatch would have rolled back the transaction. Audit fields identify the existing garden owner and use fresh edit groups. Temporary helpers were session-scoped; no persistent schema or application code changed.

## Verification

- Before: 76 Paper, 20 Sage and 5 Transparent sections across current pages.
- After: 0 Paper, 20 Sage and 81 Transparent sections.
- Updated 15 pages; verified 15 exact previous snapshots in page history.
- Anonymous live HTML checks for `/garden/pangkor` and `/garden/anniversary-02`: 200 responses, 4 and 8 sections respectively, no Paper section classes.
- Other content, colours, links, category tags, page dates, photo references, visibility and list ordering fields were retained. No original media was read or modified.

## Limits

Only Section palette backgrounds were changed, as requested. Other block backgrounds and explicit custom/content colours were retained. Restoring a prior page version can restore its former Paper sections. The live data update is complete and requires no deployment.
