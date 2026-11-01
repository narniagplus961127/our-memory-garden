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

- Claimed on `codex/ticket-13-production` from integration `02f64e4`, after verifying the completed ticket 09 worktree was tracked-clean. Design alignment was subsequently merged as `6d478de`; the complete combined baseline results are recorded below.
- Fresh local `garden_ticket13_rehearsal` successfully applied all ten checked-in migrations in sorted order; the existing isolated ticket 13 fixture also received the missing media/export migrations. Installed dependency versions match the pinned package manifest.
- Applied the rehearsed migrations through the existing dedicated hosted garden's direct connection. Connected Neon SQL independently verified all ten ledger entries, one preserved administrator, zero pages, zero photos and zero exports. No local auth/fixture setup, owner password change, reset email or content mutation was performed on production.
- Rechecked the existing Vercel project/team and verified canonical domain; production plain variables are `AUTH_MODE=neon` and `NEXT_PUBLIC_APP_URL=https://our-memory-garden.vercel.app`. All 11 environment variables target production only. Reasserted `previewDeploymentsDisabled:true`. No deployment yet.
- [Production operations](../../../docs/production-operations.md) documents exact release targets, explicit production-SHA deployment, owner setup, measured storage/provider plan sources, manual monitoring, independent backups and reviewed daily bounded expiry/staging maintenance. Automatic Git linking, managed owner acceptance and authenticated >4.5 MB Vercel downloads are not yet established.

Hosted maintenance dry runs also completed successfully against the migrated garden: zero expired export jobs (empty candidate output) and zero eligible staging uploads (`count:0`). No `--apply` cleanup was run. Local fixture tests establish actual cleanup behavior; these empty hosted runs establish connectivity and current absence of a backlog.

## Combined local verification

The candidate `6d478de` passed the complete default `npm run test:api`: 60 tests passed, no failures/skips, approximately 140 seconds. It used isolated real PostgreSQL/Better Auth and a loopback private S3 fixture; no service-file concurrency change was needed. This includes multipart archives over 4.5 MB, exact snapshot/original extraction, authenticated ranges, expiry, retry, cleanup, retained-history guards and page/privacy/concurrency boundaries. The full desktop/mobile browser matrix is running next. Production deployment is held for the final code review; this evidence does not establish hosted managed authentication or the Vercel streaming boundary.

Read-only production bucket inventory also succeeded: both `garden-originals` and `garden-display` contained zero objects/bytes at the check. The actual supported measurement source is the private bucket listing, distinct from provider billing and quota.

Baseline browser verification at `6d478de` is complete: **96 passed, 2 intentional device-specific skips, 0 failed** in 13.1 minutes. The desktop skip is the mobile-only website-menu journey; the mobile skip is native nested dragging (tap/reorder alternatives run on mobile). This was the complete 98-case matrix with one worker, after the complete 60-case API run. Storage/mobile and export/desktop screenshots were visually inspected for readable, contained layouts and real measurement/part state. Logs and evidence are retained outside the watched checkout under the shared `ticket13/` directory.

Final code review identified additional export-cleanup and recovery/address cases for the single review fixer. The baseline pass does not close those findings. Production deployment remains on hold until that candidate is merged, affected checks pass and the final build/type/format checks finish. Owner-managed authentication and deployed authenticated large downloads remain unverified.

## Current checkpoint

Ticket remains **claimed**. The hosted schema and production configuration are prepared, and monitoring/backup/maintenance guidance is complete. The complete combined local baseline is green. No production deployment has been created: final review fixes, their affected verification and the final build/type/format checks must finish first. After deployment, the owner must privately set their password through the canonical Forgot password flow and sign in before managed session, private/admin production journeys and authenticated >4.5 MB originals/archives can be verified. No reset email or password has been chosen/sent by the agent. Manual Git linking and maintenance limitations are explicitly documented.
