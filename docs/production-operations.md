# Production operations

The canonical garden is [our-memory-garden.vercel.app](https://our-memory-garden.vercel.app). Release evidence and outstanding verification are recorded in [ticket 13](../.scratch/our-memory-garden/issues/13-production-deployment.md). A successful build alone does not establish managed sign-in, private access or backups.

## Release targets

Use the existing Vercel project `our-memory-garden` (`prj_5COdyAmNBjbzwghHZHoTFaJiHgPK`) in team `team_i8TvR77HdwslGIvNMyzZl1Yx`. It runs Node.js 24 and Singapore functions (`sin1`). Keep preview deployments disabled. Explicitly choose the production target and the exact reviewed, pushed commit; the GitHub repository is `narniagplus961127/our-memory-garden` (ID `1374595301`).

The existing Neon project is `summer-thunder-00740472`, production branch `br-tiny-pond-b3zsg455`, database `garden`, PostgreSQL 17, Singapore (`aws-ap-southeast-1`). Both `garden-originals` and `garden-display` remain private. Do not create replacements when a tool cannot connect an existing project.

Vercel production needs `AUTH_MODE=neon`, `NEXT_PUBLIC_APP_URL=https://our-memory-garden.vercel.app`, `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `GARDEN_ORIGINALS_BUCKET`, and `GARDEN_DISPLAY_BUCKET`. Credentials remain server-only and production-only. The public origin is fixed at build time and must also be a managed-auth trusted origin. Use the canonical origin for sign-in and recovery, because mutation requests reject other origins.

Before release, rehearse checked-in migrations against an isolated local database. Apply them to the intended hosted database using a private environment file containing the direct `DIRECT_DATABASE_URL`, then inspect `garden_migrations`. The build does not migrate. Never run local account/fixture setup against production. Preserve administrators, content and stored photos.

A direct API release can target the existing project without a Git link: pass `target: production`, `gitSource: {type: github, repoId: '1374595301', ref: '<reviewed branch>', sha: '<reviewed pushed SHA>'}`, and project settings `framework: nextjs`, `nodeVersion: 24.x`, `installCommand: npm ci`, `buildCommand: npm run build`, `serverlessFunctionRegion: sin1`. Confirm READY, source SHA, production target, alias assignment and anonymous canonical access. Record the deployment ID.

The existing project was connected to `narniagplus961127/our-memory-garden` on 2026-11-01; the connected Vercel Git deployment context independently confirms that exact repository link. The reviewed main push `9e60cfcbda8fe2b04cbdb4863c6506718e64f923` then automatically created production deployment `dpl_8NF6NtLTDJdmMc2vyGEizsEfb5ME`, confirming actual production delivery from `main`. Keep previews disabled. Inspect existing deployments for the exact pushed SHA before creating an explicit deployment to avoid duplicates. [Production deployment API](https://vercel.com/docs/rest-api/deployments/create-a-new-deployment), [Git production branch](https://vercel.com/docs/git#production-branch).

## Owner setup and production checks

The first owner identity and immutable administrator allowlist entry exist. The owner sets their own password using **Forgot password** on the canonical application and the emailed link, then signs in. Do not choose a password, disclose reset tokens or log authentication state. Provision the second administrator only when their email is supplied. Direct upstream registration does not grant garden access.

After owner setup, verify desktop and mobile sign-in, reload/session restoration, sign-out, private page denial anonymously, ordinary page creation/editing, navigation and public visibility changes. Verify a real photo upload, display access before/after the final public use is removed, and protected original download. Verify export preparation, manifest and every downloaded part. Include an original and archive larger than 4.5 MB, exact-byte comparison, authenticated Range resume and denial after sign-out. A local Better Auth fixture and direct Neon object round-trip do not prove these deployed boundaries. Use owner-authorized content and preserve it; do not seed fake production administrators or destructive fixture data.

Neon shared SMTP is available initially. The hosted reset email and its return URL require actual owner verification. Custom SMTP is recommended for production delivery/limits but is not configured here. [Managed-auth production checklist](https://neon.com/docs/auth/production-checklist).

## Monitoring and storage

In the garden, open **Settings → Storage** and use **Refresh usage**. The application paginates both private bucket inventories and shows originals, optimized displays, exports and staging bytes with a measurement timestamp. Database bytes come separately from `pg_database_size(current_database())`. A failed refresh marks the last confirmed value stale; unknown plan/quota values stay unavailable.

For current billed usage, allowance and plan, follow **View provider dashboard**, select **Our Memory Garden** in the Neon console and inspect project/organization usage and billing. Do not interpret physical database bytes or bucket listings as the provider's billed total. On 2026-11-01 the existing organization's returned subscription was `free_v3`; recheck the console before deciding to upgrade. [Neon monitoring](https://neon.com/docs/introduction/monitoring), [Neon plans](https://neon.com/pricing).

After each release, inspect Vercel deployment/build events and runtime logs for errors, including login, media and export routes; record timestamps and request IDs without passwords, cookies, reset links or credentials. Check canonical public access and an administrator session. Check Neon project Monitoring if database latency/errors rise. Review storage and provider usage weekly and after large imports/exports. Exports and abandoned uploads also occupy storage until maintained. [Vercel runtime logs](https://vercel.com/docs/logs/runtime).

This release uses manual owner/operator checks. No unattended alert service, external log drain or maintenance scheduler is implied. If the canonical site fails, inspect the failing deployment and runtime logs before retrying. Roll back to a known-good production deployment if available; rollback does not reverse database migrations. Preserve data and reconcile schema compatibility before rolling code back. No earlier production deployment has been verified healthy for rollback; the initial deployment exposed the corrected SDK configuration error.

## Independent backup routine

Use **Settings → Export garden** weekly and after substantial changes. Leave preparation open or reload and resume the recorded snapshot. Wait for every part to be ready; download the manifest and every listed TAR part before the shown expiry (24 hours after the latest preparation step). Extract all parts into one folder with a standard archive tool. Check that the manifest is complete, every listed filename/size is present, expected content JSON opens and several originals match the source files. Keep a dated copy on another device or storage provider with private access; retain several generations. The copy in the same Neon bucket is temporary and is not an independent backup.

The v2 archive includes private/public pages, trash, retained versions, navigation/settings, categories and original-photo inventory. It excludes passwords, authentication sessions and credentials. Retain source code and deployment configuration separately. There is no automatic archive importer; recovery requires inspecting the content and restoring deliberately. For a full database disaster recovery plan, also keep an independently secured PostgreSQL dump with approved database tooling and test restoration in an isolated database. Provider history/instant restore is useful but has a plan-dependent retention window and does not replace downloaded content/original backups. [Backup format and limits](media-backups.md), [Neon instant restore](https://neon.com/docs/postgres/backup-restore/branch-restore).

## Expiry and staging maintenance

Run these from a reviewed checkout on a trusted operator machine with Node.js 24 and installed dependencies. The ignored `.env.neon.local` must point at the dedicated hosted garden and its private buckets. Inspect the target metadata without printing credentials first. Never use the local test env for hosted maintenance or publish the private env file.

```powershell
node --env-file=.env.neon.local scripts/cleanup-exports.mjs
node --env-file=.env.neon.local scripts/cleanup-media-staging.mjs
```

These are dry runs. Review the candidate IDs; export cleanup selects at most 10 expired jobs, and staging cleanup selects at most 100 pending uploads expired for over an hour. Run maintenance daily while actively uploading/exporting and after a large backup session once its temporary copies expire. Empty output from export cleanup means no eligible jobs. After review, use:

```powershell
node --env-file=.env.neon.local scripts/cleanup-exports.mjs --apply
node --env-file=.env.neon.local scripts/cleanup-media-staging.mjs --apply
```

Export maintenance deletes only validated recorded export keys and expired private snapshot/pin records, keeping retryable state if object deletion fails. `--export-id=<uuid>` can narrow it to one expired export. Staging maintenance deletes only recorded staging keys, retains audit records and does not delete ready originals/displays. Repeat dry-run/apply in bounded batches until the backlog is clear. Inspect nonzero exit/error output and retry after correcting connectivity; do not manually delete whole buckets or page/history rows. Deleting expired temporary copies never deletes already downloaded independent backups.
