# Identical photo uploads

All upload inputs use the shared queue. Before requesting an upload URL, the browser fingerprints the selected original with SHA-256 and sends only the fingerprint, size and ordinary file metadata. The authenticated server looks for a ready original with that fingerprint and byte size. A match returns its existing ID/name without creating a pending upload or signed URL.

The queue offers **Use existing photo**, **Upload another copy** and **Skip**, plus **Reuse all identical photos**. Reuse rechecks the current ready photo and fingerprint before marking the queued item Reused; it sends no photo bytes and retains the existing library name and position. Adding a photo to a page still uses the existing library selection flow. Explicit copies receive independent IDs and use the normal upload/processing path.

Fingerprints stored in `media_photos.original_sha256` are calculated by the server from the already-read original during successful completion. Client fingerprints are lookup hints and never become stored evidence. Matching requires current administrator access. Deleting/deleted photos cannot be reused; a stale choice retains the file and offers retry. Existing original/display visibility and reference protections are unchanged.

The queue serializes identical files within the current tab while allowing unrelated files to use its two upload slots. Duplicate choices and retryable errors keep File references and the existing unload warning until resolved or skipped. Cancel, sign-out and account changes release those references and prevent late hashing/request callbacks from restarting work. Only bounded originals up to 25 MB are hashed, with at most two active jobs; no browser-persistent photo bytes or new service is introduced.

## Scope and release

The owner chose **new uploads first**. Migration `0025-photo-fingerprints.sql` adds a nullable verified fingerprint and a partial ready-photo lookup index; it does not read any originals. Existing unindexed photos are deliberately left alone. New completions are indexed even when older clients omit a lookup fingerprint. Calling completion on an already-ready old photo does not scan or index it.

Matching is for identical original bytes, not visual similarity. Edited/recompressed files can differ even if they look the same. Independent tabs/administrators can still upload the same file simultaneously before either copy becomes ready; intentional copies are also allowed, so the index is not unique and no existing duplicates are merged or deleted.

Apply the additive migration before deploying the updated application. Rolling back application code can leave the nullable column/index in place safely. There is no historical backfill or automatic scan.
