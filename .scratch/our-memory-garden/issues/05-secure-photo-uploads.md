# 05: Upload and use photos securely

## What to build

Upload photos to a shared library and use them on pages with privacy appropriate to their public use.

## Blocked by

- 03: Publish a page and edit the homepage
- 04: Build pages with visual blocks and templates

## Status

resolved

## Acceptance criteria

- [x] Upload and reuse a photo in an image block; retain a protected original and serve optimized copies with metadata removed.
- [x] Restrict private-only photos and originals; mark photos used publicly as publicly accessible.
- [x] When public use ends, restrict photos with no remaining public use; verify access across visibility changes.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


## Admin screen reference

Follow the Media library screen for the upload and shared-photo entry point.


## Photo detail design

Follow the desktop and mobile Photo details screens for the preview, public-access indicator, page usage, original download and in-use deletion safeguard. Implement and verify private-only and unused-photo states as required by the spec; the illustrated example is not a complete flow.

## Answer

Implemented the real shared media library and Puck image picker with per-file upload progress, processing, retry and failed-file removal. Originals remain private and downloadable only by administrators; display WebP copies are optimized, auto-oriented and stripped of hidden metadata. Presigned uploads are size-bound and finalize to server-written immutable keys, so staging replay cannot replace a ready original. Missing or still-pending nested photo references are rejected before page saving.

Current live public page references determine display access on every gateway request; shared/private/trash usage follows the recursive exact-key scanner. Photo details show actual usage, accessibility, original download and the in-use deletion safeguard. Unused deletion/export remain ticket 11.

Verified real local API/storage/auth boundaries, desktop/mobile upload and Puck reuse, public rendering and immediate nested/shared privacy transitions. Hosted private-bucket signed put/get and presigned PUT pass; unsigned access is denied. Exact production-origin bucket CORS configuration and browser preflight are verified. See [implementation notes](../../../docs/implementation-notes.md) and [test instructions](../../../tests/README.md).

## Known limitations

- Hosted managed-auth browser uploads and streamed original downloads above Vercel’s body limit remain ticket 13 deployment verification.
- The bounded cleanup CLI defaults to dry-run and only removes recorded pending staging objects after expiry plus one hour. Ticket 13 owns production invocation/scheduling. Ready staging replays and partial unfinished output cleanup remain retention maintenance follow-up; no ready original/display or page/version content is removed.
- Future ticket 11 deletion must include trash/history references and coordinate row locks with page-reference writes; ticket 05 supplies no deletion endpoint.
- The local loopback-only S3 fixture has development dependency advisories; production dependencies retain the existing seven low advisories.

## Delivery verification

The combined media/navigation/cleanup boundary passes eleven API checks after merging integration 0ac1587. All eight affected desktop/mobile browser journeys passed, with one desktop media rerun after a concurrent-build processing timeout; isolated finalization took 534 ms. The earlier full media/Puck browser regression passed eleven cases with the intentional mobile drag skip. Production build, typecheck and format checks pass. Storage aliases and isolated fixture ports are documented for later tickets.
