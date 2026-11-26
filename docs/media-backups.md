# Media retention and legacy archive cleanup

Garden archive export and page JSON downloads were removed at the owner's request on 2026-11-26. The Settings export screen and archive creation, preparation, manifest and part-download routes are unavailable. Page content import from JSON, another page or a template remains supported; see [page JSON](page-json.md). Protected individual original-photo downloads remain available in the Media Library.

## Deletion boundary

The media library is shared by administrators. Usage comes from saved current pages, including trash, covers and sharing settings. History-only references are not active usage. Only current, non-trashed public pages grant anonymous display access; retained history never grants access.

`DELETE /api/media/[id]` requires an administrator, matching origin and confirmation. It locks the media row, checks current uses and any unexpired legacy archive reservation, then claims deletion. Concurrent page attachment shares the same media locks. Removing a block never deletes a library photo automatically. After removing its last current use and saving, an administrator may delete the unused photo explicitly. Saved versions then lose access to those bytes; restoring a version with unavailable photos is rejected without changing the current page.

Storage failure after deletion starts retains a labelled unfinished operation for retry. A rejection before the deletion claim preserves the usable photo. Ready original and display photos are never deleted by temporary-data maintenance.

## Legacy temporary archives

Feature removal does not erase existing content, history, photos or downloaded files. Old archive records and stored parts expire under their existing lifetime (24 hours after the last preparation step). Unfinished photo reservations stop blocking deletion after expiry. No new archive jobs or reservations can be created.

The existing daily maintenance job and `scripts/cleanup-exports.mjs` continue to clean only validated expired archive keys and their temporary records. CLI runs are dry-run by default; inspect candidate IDs before using `--apply`. Batches remain bounded, overlapping runs are skipped, and failures remain retryable. See [production operations](production-operations.md#expiry-and-staging-maintenance). Historical migrations are retained for deployed database compatibility; no schema or production data deletion is required to retire the feature.

## Storage measurements

Settings → Storage still measures original, optimized display, legacy archive and staging bytes using paginated private bucket listings, plus physical PostgreSQL database bytes. A failed refresh keeps the last confirmed value marked stale. Legacy archives remain counted until cleanup succeeds. These measurements are separate from provider billing and quotas. Usage history may include archive traffic recorded before removal.
