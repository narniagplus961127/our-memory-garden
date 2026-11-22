# 87 — Reduce repeated photo delivery work without weakening privacy

Status: resolved

The owner approved the high-priority system-review findings on 2026-11-22. Keep current public-use and administrator checks live for every image request, including conditional responses. Avoid managed-session lookups for already-public optimized copies. Cache immutable optimized bytes in bounded process memory only after authorization; never cache permission decisions, originals or errors. Keep browser responses private and revalidated, so cached bytes cannot bypass an unpublish or deletion.

This stage reduces repeated object-storage transfer on warm application instances. It does not bypass Vercel or eliminate Fast Origin Transfer. A separate revocable delivery service remains a future infrastructure decision; do not expose bucket objects through reusable signed download URLs.

Verify storage cache limits/expiry, existing media privacy/deletion tests, conditional display and thumbnail requests, and revoked managed sessions. No production photo/content mutations or storage migration are required.

## Resolution — 2026-11-22

Public optimized image delivery now authorizes through current public usage before requesting managed authentication. Protected originals and private optimized copies still revalidate administrator access. Private full-size previews now receive the same private, revalidated ETags as thumbnails, allowing 304 responses instead of repeated image bodies; unauthorized conditional requests remain 404.

Added a process-local LRU cache of optimized bytes: 32 MB total, 1 MB per image, 256 entries, five-minute expiry. Permission checks run before cache reads and conditional responses. Originals, errors and permission decisions are never cached. Larger images continue streaming. This reduces repeated storage fetches on warm instances, not fresh-download Fast Origin Transfer; no cross-instance or CDN cache guarantee is made.

Three cache boundary tests, type checking and nine local media/privacy service tests passed, including public-use removal, byte-free private revalidation, anonymous ETag denial, real outsider denial, upload validation and protected originals. The complete production build/managed runtime regression is repeated with ticket 88 before delivery. No database migration or production-content change.
