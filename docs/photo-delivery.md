# Photo delivery and transfer costs

Both object buckets stay private. Each image request checks current ready-photo status and public page usage; otherwise it must pass current administrator authorization. Missing photos and unauthorized reads return 404, including requests that present a previously valid ETag. A public optimized photo does not require a managed-auth request. Original downloads always require administrator access and remain private/no-store.

Optimized images, including private editor previews, use private/no-cache plus immutable ETags. Browsers must revalidate every reuse; a permitted unchanged image receives 304 without a photo body. This saves repeat origin transfer while preserving the access check. No public CDN cache or signed object-download URL bypasses visibility changes.

After live authorization, optimized copies up to 1 MB can reuse server memory on a warm application process. The byte cache is LRU, at most 32 MB and 256 entries, and expires after five minutes. Larger copies and originals stream from storage. Permission decisions and failures are never cached. Completed photo keys are immutable, and deleted/deleting photo records cannot access retained bytes. No shared database cache or additional billed service is introduced.

These changes reduce managed-auth calls, repeat storage downloads, and repeat private-preview response bodies. Cold server instances and first photo downloads still use storage and Vercel Fast Origin Transfer. A separate media service with revocable access would be needed to remove Vercel from the byte-delivery path; ordinary reusable signed URLs or public immutable caching do not satisfy the current immediate-revocation boundary.
