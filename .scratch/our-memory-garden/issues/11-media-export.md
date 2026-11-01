# 11: Manage and export the photo collection

## What to build

Find and manage shared photos and export the garden for independent backup.

## Blocked by

- 05: Upload and use photos securely

## Status

resolved

## Acceptance criteria

- [x] Search the library and show where photos are used and whether they are publicly accessible.
- [x] Prevent deleting a photo while it is referenced and explain where it is used.
- [x] Export page content and original photos for independent backup.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


## Admin screen reference

Use the Media library and Settings screens as the entry points for media management and export.


## Settings design reference

Use the Export settings screen for the entry point to an independent copy of page content and original photos.


## Photo detail design

Follow the desktop and mobile Photo details screens for the preview, public-access indicator, page usage, original download and in-use deletion safeguard. Implement and verify private-only and unused-photo states as required by the spec; the illustrated example is not a complete flow.
## Answer

Implemented searchable shared media, deduplicated live/history page usages and public-access indicators derived only from live public pages. Confirmed unused deletion locks and validates media references transactionally, including retained versions, covers, sharing covers and unfinished export pins. Partial object cleanup retains an explicit unfinished-deletion tombstone with retry; it cannot be attached or exported. A lost successful deletion response is reconciled through a fresh authenticated lookup.

Settings exposes actual measured storage and independent backups. A repeatable-read snapshot captures all pages (private/trash included), settings/navigation, categories, retained history and ready original inventory. The versioned manifest and bounded TAR parts cover the complete collection without a total-size cap. Preparation resumes one part at a time, exposes only successfully stored parts, preserves snapshot identity on retry and releases pins only after originals are archived or cancellation/expiry. Private authenticated streamed downloads support byte ranges. Explicit expiry maintenance has dry-run/apply modes and retryable object cleanup. See [backup contracts and operations](../../../docs/media-backups.md).

### Verification

- 34 affected service checks passed before the sharing merge. All 18 combined media-export/discovery/organization service checks passed after ticket 12 integration. Final targeted multipart, cover/date/category/sharing snapshot and actual ticket 10 history/trash/permanent-delete integration checks passed (3/3). Cleanup CLI dry-run and actual deletion of generated local archive objects/records passed.
- Desktop/mobile browser journeys passed for search, confirmation and both failed-request/lost-successful-response deletion recovery; measured storage/stale refresh and multipart create/reload/resume/manifest/download/expiry; and cancellation during a held preparation response. Native and responsive desktop/mobile screenshots were inspected. A stale resumed development-server reload loop was resolved by restart; assertions and application readiness were not weakened.
- Final production build, TypeScript and repository formatting passed. Current integration 07cb5a1 includes tickets 07, 09, 10 and 12. Local fixtures used the isolated database/auth and real loopback S3-compatible service. Root independently verified the streaming transport against a temporary Neon object (exact 6,291,593-byte hash, range and unsigned denial), then removed it.

### Known limitations

The archive is an independent content/original-file backup; automatic import is outside this ticket. Each preparation invocation is bounded (8 MiB metadata, 200 MiB originals and a 260-second operation deadline); slow parts remain retryable instead of falsely ready. Hosted Vercel gateway/auth/throughput verification and production maintenance scheduling remain ticket 13. Export snapshot rows and stored parts consume measured storage until explicit expiry cleanup. Provider plan, billing and quota are not inferred from these measurements. No hosted content was deleted by this ticket.
