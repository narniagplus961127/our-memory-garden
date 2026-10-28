# Backend setup

The owner approved Neon in place of Supabase on 2026-10-28. The Supabase project creation attempt failed because the account already had two active free projects; neither existing project was modified.

## Hosted resources

| Resource | Configuration |
| --- | --- |
| Neon organization | QW, free plan |
| Neon project | `summer-thunder-00740472` — Our Memory Garden |
| Region | Singapore, `aws-ap-southeast-1` |
| Database | `garden`, PostgreSQL 17 |
| Production branch | `br-tiny-pond-b3zsg455` |
| Authentication | Managed Better Auth, isolated server adapter |
| Original photos | `garden-originals`, private bucket |
| Display photos | `garden-display`, private bucket |
| Vercel project | `our-memory-garden`, `prj_5COdyAmNBjbzwghHZHoTFaJiHgPK` |
| Vercel team | QW, `team_i8TvR77HdwslGIvNMyzZl1Yx` |
| Vercel region | `sin1` |

The first owner identity has been provisioned. Application access still requires its immutable user ID in the garden administrator table. Provision the second identity separately when the owner supplies its email. No registration page is provided. Upstream managed-auth account creation alone must never confer application access.

Hosted credentials are kept in ignored environment files and Vercel production environment variables. Database credentials, the auth cookie secret and storage credentials are server-only. Never commit environment files or print their values. Example files document names only.

## Application boundaries

The browser talks to authenticated Next.js server routes/actions. Those routes verify sessions and administrator membership before accessing restricted data. Public reads select public, non-trashed pages. The Neon Data API is not enabled for this application.

Both photo buckets remain private. The application serves optimized display copies through a route that checks current public-page references or administrator membership. Original-download routes require administrator membership. Display responses must not be cached beyond visibility changes. This implements revocation when a photo has no remaining public use without relying on unsupported per-object S3 ACL changes.

The custom authentication UI uses the pinned managed SDK's email/password and password-reset APIs. Shared provider SMTP is available for initial use; delivery and trusted redirect domains must be exercised through the hosted flow before claiming them verified.

## Deployment and verification

The Vercel project has production environment variables configured. Preview deployments were disabled when creating it. Resource provisioning is not application deployment: ticket 13 owns the final release and production verification.

Use isolated local PostgreSQL/auth fixtures for destructive tests. Record local adapter results separately from hosted managed-auth and storage results. Preserve the owner identity and any real content during verification.

Official references: [Neon pricing](https://neon.com/pricing), [regions](https://neon.com/docs/introduction/regions), [managed auth](https://neon.com/docs/auth/overview), [storage](https://neon.com/docs/storage/overview).
