# 102 — Rename library photos and add searchable labels

Status: resolved

Add photo name/label editing in Photo details, used across the shared library and editor pickers. Keep IDs, object keys, fingerprints, image URLs, page content and visibility unchanged. Search names/labels in both ordinary and Photo Grid pickers. Use bounded validation, current administrator/origin checks and optimistic concurrency with safe retry. Labels are administrator metadata and must not leak through visitor image/grid responses. Add an additive metadata-only migration; do not read existing originals.

## Answer

Added an Organize tab with photo-name and comma-separated label editing, server validation, a separate metadata version, idempotent retry and explicit stale-edit recovery with drafts retained. Cards refresh names/labels and filtered results after saving; both picker searches include labels. New edits clear stale success notifications so mobile save controls stay usable. Manual backup snapshots retain labels alongside names. Migration 0026 adds metadata columns and a bounded label constraint; it performs no object reads or rewrites.

Nine service checks pass, including input/auth/origin/concurrency, label privacy/search, unchanged image IDs/keys/fingerprints/bytes/ETags, upload deduplication and manual-backup metadata snapshots. Desktop/mobile edit/search/reload journeys, TypeScript, formatting and production build pass. See docs/garden-browsing-photo-labels.md.

Known limits: labels are shared administrator metadata, not public captions; up to 20 labels of 40 characters each and a 200-character name. Migration 0026 must precede deploying this code. Code rollback can safely leave the additive metadata columns in place.
