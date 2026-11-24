# 99 — Offer reuse of identical newly uploaded photos

Status: resolved

Detect exact original-file duplicates in the shared upload queue before transferring bytes and offer reuse or upload another copy. Apply across Media Library and editor pickers, preserve cancellation/retry/account boundaries and current photo privacy/deletion rules. Only trust server-verified hashes for matches. The owner explicitly chose new uploads first: do not scan the 1,136 existing originals (~2.4 GB), auto-delete existing duplicates or add a paid service. Existing unindexed photos cannot be matched until separately indexed.

## Answer

The shared queue hashes each bounded selected original before requesting an upload URL. Ready matches offer Use existing photo, Upload another copy, Skip and Reuse all identical photos. Identical files in the current tab wait for the first completion while unrelated files keep using the two upload slots. Reuse revalidates the ready photo without uploading bytes. Retry and account-change guards preserve or release files appropriately. The file input is disabled until its client handler is ready, fixing an observed early-selection loss during hydration.

Migration 0025 adds a nullable original_sha256 and a partial lookup index. Only the server-derived digest from already-read original bytes is stored during successful completion; client hashes are hints. No original backfill, extra service, automatic deletion or permission change is introduced. Legacy clients still upload normally and their new completions are indexed.

Validation: 12 queue checks across the desktop/mobile projects, four new search/duplicate browser journeys and four shared-upload/sign-out regression journeys pass. Eight API checks pass, including existing media privacy/size/deletion/reference protections and the new server-fingerprint/reuse/copy/unindexed-boundary case. TypeScript, targeted formatting, diff checks and production webpack build pass. The shared-upload regression fixtures were updated for distinct original bytes and the current sidebar/plain-link navigation, with awaited route changes. Reviewed the duplicate-choice desktop screenshot.

Known limits: unindexed existing originals are not matched; edited/recompressed files are distinct; simultaneous uploads in separate tabs can race before either becomes ready. The non-unique index permits deliberate copies. Reuse retains the existing library name and position and does not automatically insert it into a page. See docs/photo-duplicates.md for release and rollback requirements.
