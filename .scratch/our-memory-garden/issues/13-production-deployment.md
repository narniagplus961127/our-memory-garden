# 13: Deploy the production garden

## What to build

Publish and verify the finished garden on Vercel with Neon in Singapore and the planned GitHub repository.

## Blocked by

- 06: Create photo galleries
- 07: Organize and display pages
- 08: Manage navigation and page links
- 09: Protect edits and resolve conflicts
- 10: Recover and delete pages safely
- 11: Manage and export the photo collection
- 12: Control public-page discovery

## Status

claimed

## Acceptance criteria

- [ ] Deploy production with no preview deployments and connect the intended Neon PostgreSQL, managed authentication and Object Storage services in Singapore.
- [ ] Verify key public, private and administrator journeys on desktop and mobile in production.
- [x] Document how to monitor storage and maintain independent backups.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


## Admin screen reference

The Settings design includes a storage-monitoring entry point; verify the production usage-monitoring method and document it.


## Settings design reference

Use the Storage settings screen as the usage-monitoring entry point; confirm an actual supported source for current usage and plan information.


## Release preparation — 2026-11-01

- Claimed on `codex/ticket-13-production` from integration `02f64e4`, after verifying the completed ticket 09 worktree was tracked-clean. Final design-alignment integration and combined application checks are still pending.
- Fresh local `garden_ticket13_rehearsal` successfully applied all ten checked-in migrations in sorted order; the existing isolated ticket 13 fixture also received the missing media/export migrations. Installed dependency versions match the pinned package manifest.
- Applied the rehearsed migrations through the existing dedicated hosted garden's direct connection. Connected Neon SQL independently verified all ten ledger entries, one preserved administrator, zero pages, zero photos and zero exports. No local auth/fixture setup, owner password change, reset email or content mutation was performed on production.
- Rechecked the existing Vercel project/team and verified canonical domain; production plain variables are `AUTH_MODE=neon` and `NEXT_PUBLIC_APP_URL=https://our-memory-garden.vercel.app`. All 11 environment variables target production only. Reasserted `previewDeploymentsDisabled:true`. No deployment yet.
- [Production operations](../../../docs/production-operations.md) documents exact release targets, explicit production-SHA deployment, owner setup, measured storage/provider plan sources, manual monitoring, independent backups and reviewed daily bounded expiry/staging maintenance. Automatic Git linking, managed owner acceptance and authenticated >4.5 MB Vercel downloads are not yet established.

Hosted maintenance dry runs also completed successfully against the migrated garden: zero expired export jobs (empty candidate output) and zero eligible staging uploads (`count:0`). No `--apply` cleanup was run. Local fixture tests establish actual cleanup behavior; these empty hosted runs establish connectivity and current absence of a backlog.

## Combined local verification

The candidate `6d478de` passed the complete default `npm run test:api`: 60 tests passed, no failures/skips, approximately 140 seconds. It used isolated real PostgreSQL/Better Auth and a loopback private S3 fixture; no service-file concurrency change was needed. This includes multipart archives over 4.5 MB, exact snapshot/original extraction, authenticated ranges, expiry, retry, cleanup, retained-history guards and page/privacy/concurrency boundaries. The full desktop/mobile browser matrix is running next. Production deployment is held for the final code review; this evidence does not establish hosted managed authentication or the Vercel streaming boundary.

Read-only production bucket inventory also succeeded: both `garden-originals` and `garden-display` contained zero objects/bytes at the check. The actual supported measurement source is the private bucket listing, distinct from provider billing and quota.
