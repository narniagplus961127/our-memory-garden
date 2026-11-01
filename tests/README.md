# Browser journey boundary is the pre-agreed seam from the specification.

# Service tests exercise real local authentication and data-API authorization.

## Media boundary tests

Use the dedicated local database and real local Better Auth accounts as described in `docs/backend-setup.md`. Set the AWS variables in `.env.local` and `.env.test` to the same S3-compatible fixture (endpoint `http://127.0.0.1:59005`, region `ap-southeast-1`, access/secret key `S3RVER`, private bucket names `garden-originals` and `garden-display`). Start `node --env-file=.env.test scripts/local-s3.mjs` in another terminal before the app. This development fixture only binds loopback and stores disposable bytes under ignored `work/local-s3/`.

Run `node --env-file=.env.test --test tests/service/media.test.mjs` against the running app. Run `npx playwright test tests/browser/media.spec.ts` with PORT/PLAYWRIGHT_BASE_URL matching the configured application/auth origin. Browser network failure injection occurs at the public upload HTTP boundary; successful requests use the real storage and processing flow. The signed outsider fixture uses the real Better Auth provider directly to obtain a session, then checks that garden API authorization denies that identity.

Hosted credentials must be kept separately in an ignored environment file. `node --env-file=.env.neon.local scripts/media-storage-smoke.mjs` uses only uniquely named temporary objects in the actual private buckets and removes them afterward; it never runs a local auth/database fixture. Configure production browser uploads with `MEDIA_CORS_ORIGIN=https://our-memory-garden.vercel.app node --env-file=.env.neon.local scripts/configure-media-cors.mjs` (set the environment variable using the native shell on Windows). This preserves existing CORS rules and validates the actual presigned-URL OPTIONS response. Local success does not establish hosted managed-auth browser behavior or Vercel large streamed downloads.

Staging maintenance: run `node --env-file=.env.local scripts/cleanup-media-staging.mjs` to inspect up to 100 pending uploads expired for over an hour. Add `--apply` only after inspecting the dry-run IDs. It deletes only recorded server-generated staging keys, keeps photo records with an audit marker, and never deletes originals/display copies. `tests/service/staging-cleanup.test.mjs` simulates elapsed time only in the guarded local fixture and verifies dry-run, expired-pending cleanup and ready-photo retention through the real CLI and storage boundaries. Scheduling production maintenance is ticket 13.

The local storage port can be set with `LOCAL_S3_PORT`; otherwise it follows the loopback `AWS_ENDPOINT_URL_S3` port, then defaults to 59005. Set both consistently for parallel worktrees. The runtime and maintenance scripts accept `GARDEN_ORIGINALS_BUCKET` / `GARDEN_DISPLAY_BUCKET` as aliases; explicit `MEDIA_*` values take precedence.

## Gallery boundary tests

`tests/service/gallery.test.mjs` uses the real local upload/finalization API, authenticated page API and anonymous media gateway to verify nested ordered galleries, caption persistence, invalid photo references, current public/private access and protected originals. Run it with the same isolated local database/auth/S3 environment as the media tests.

`tests/browser/gallery.spec.ts` composes a gallery using the actual shared library in Puck, edits captions, moves/removes photos, reloads and publishes the saved page. Desktop/mobile visitor contexts verify the responsive grid and enlarged viewer, matching captions/count, previous/next/close, keyboard arrows/Escape, focus return and 44 px controls. Fixtures are uploaded photographs generated at test time; the application does not substitute sample photos. Hosted managed-auth and deployed-browser checks remain ticket 13.

## Organization boundary tests

`tests/service/organization.test.mjs` verifies category creation/rename, optional calendar dates, metadata conflict checks, ready-cover validation, nested manual/category page grids, current visitor/admin filtering and cover-only media access transitions. Use a running isolated local application, database/auth accounts and S3 fixture; never point fixture tests at hosted credentials.

`tests/browser/organization.spec.ts` uses desktop/mobile Puck controls to create/rename categories, choose a real uploaded cover, refresh saved details, order a nested page grid and select its category. The actual 1280/390 px editor iframes and anonymous visitor contexts verify responsive rendering and private-page exclusion. Details checks also exercise failed/unfinished recovery, separate tab copies, two-administrator metadata changes and sign-out with a delayed response. Set PORT/PLAYWRIGHT_BASE_URL to the isolated origin (ticket 07 used 3007 with S3 port 59007). Screenshots are written under ignored `work/ticket07-evidence/`.

## Page recovery boundary tests

`tests/service/page-recovery.test.mjs` verifies trusted grouped history, exact displaced revision preservation, current-version restore races, live visibility/address/homepage invariants, metadata counter advancement, real non-administrator denial, cross-origin denial, stable-ID private trash restoration, permanent-delete restrictions and cascade, historical links to deleted targets, all supported inbound warnings, real uploaded image/cover/original privacy boundaries and sharing restoration with explicit null/false versus absent legacy keys. Run against the isolated local database/auth/S3 fixture with `node --env-file=.env.test --test tests/service/page-recovery.test.mjs`; never use hosted credentials for these fixtures.

`tests/browser/page-recovery.spec.ts` verifies the desktop/mobile read-only history, explicit restore/trash/permanent-delete confirmations, cancel, persistent success feedback, anonymous route denial and retry after injected HTTP restoration/deletion failures. The test waits for confirmed persistence before navigating. Screenshots are written under ignored `work/history-desktop.png` and `work/history-mobile.png`. Build only after browser testing and the development server have stopped because they share the Next output directory.

The sharing-history compatibility case uses a genuine pre-0012 fixture when present; otherwise it constructs the same missing-key row shape only in a guarded loopback database fixture. Its restoration and metadata-counter assertions still use the authenticated HTTP interface.

## Media management and backup boundary tests

`tests/service/media-export.test.mjs` exercises the real library, page/category/sharing APIs, retained-version data boundary and private S3 bytes. Start the local fixture with `LOCAL_S3_FAULTS=1` for the partial-delete test. Set `LOCAL_EXPORT_PART_BYTES=6291456` in the isolated app/test environments to force several original parts using ordinary fixtures; the override is accepted only for a loopback S3 endpoint. The archive checks use a standard `tar` executable to extract all parts into one temporary directory and compare exact original bytes and snapshot records. The cleanup test runs `scripts/cleanup-exports.mjs` in dry-run/apply mode against only its own cancelled local export.

`tests/browser/media-export.spec.ts` covers desktop/mobile search, deletion retry, measured/stale storage, multipart reload/resume/download/expiry and active cancellation with a late real preparation response. `TEST_ARTIFACT_DIR` optionally sends screenshots outside the watched project; Playwright's `--output <directory>` can similarly place traces externally during local dev-server diagnosis. See `docs/media-backups.md` for the versioned format, retention/locking contracts and maintenance limits. Hosted validation remains separate.
