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

resolved

## Acceptance criteria

- [x] Deploy production with no preview deployments and connect the intended Neon PostgreSQL, managed authentication and Object Storage services in Singapore.
- [x] Verify key public, private and administrator journeys on desktop and mobile in production.
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
- Rechecked the existing Vercel project/team and verified canonical domain; production plain variables are `AUTH_MODE=neon` and `NEXT_PUBLIC_APP_URL=https://our-memory-garden.vercel.app`. All 11 environment variables target production only. Reasserted `previewDeploymentsDisabled:true`. This preflight preceded the releases recorded below.
- [Production operations](../../../docs/production-operations.md) documents exact release targets, explicit production-SHA deployment, owner setup, measured storage/provider plan sources, manual monitoring, independent backups and reviewed daily bounded expiry/staging maintenance. Managed owner, large-download and Git-link acceptance followed this preparation and are recorded below.

Hosted maintenance dry runs also completed successfully against the migrated garden: zero expired export jobs (empty candidate output) and zero eligible staging uploads (`count:0`). No `--apply` cleanup was run. Local fixture tests establish actual cleanup behavior; these empty hosted runs establish connectivity and current absence of a backlog.

## Combined local verification

The candidate `6d478de` passed the complete default `npm run test:api`: 60 tests passed, no failures/skips, approximately 140 seconds. It used isolated real PostgreSQL/Better Auth and a loopback private S3 fixture; no service-file concurrency change was needed. This includes multipart archives over 4.5 MB, exact snapshot/original extraction, authenticated ranges, expiry, retry, cleanup, retained-history guards and page/privacy/concurrency boundaries. The complete desktop/mobile browser results follow below. This local evidence does not establish hosted managed authentication or the Vercel streaming boundary.

Read-only production bucket inventory also succeeded: both `garden-originals` and `garden-display` contained zero objects/bytes at the check. The actual supported measurement source is the private bucket listing, distinct from provider billing and quota.

Baseline browser verification at `6d478de` is complete: **96 passed, 2 intentional device-specific skips, 0 failed** in 13.1 minutes. The desktop skip is the mobile-only website-menu journey; the mobile skip is native nested dragging (tap/reorder alternatives run on mobile). This was the complete 98-case matrix with one worker, after the complete 60-case API run. Storage/mobile and export/desktop screenshots were visually inspected for readable, contained layouts and real measurement/part state. Logs and evidence are retained outside the watched checkout under the shared `ticket13/` directory.

Final code review identified four export-cleanup and recovery/address defects. The single review fixer delivered `86d1cd5`, merged with the operations checkpoint into reviewed candidate `8a7c0fdae78996200b482c090ad87b4b172f566a`. Both standards and specification follow-up reviews report zero remaining findings; the affected candidate verification follows below. Owner-managed authentication and deployed authenticated large downloads were still pending at this local-review checkpoint; later production evidence follows.

## Current checkpoint

Ticket is **resolved**. The reviewed application is live on the canonical production site from main `a20fdb95db1a26362dc11a8b1d279501e04392a9`, with all 21 anonymous canonical checks passing. Singapore resources, hosted migrations, approved design, local full/affected checks, managed owner sessions, desktop/mobile editor persistence, dashboard navigation, actual large original/archive downloads, exact bytes, Range resume and public/private media boundaries are verified below. The owner confirmed signing out of the verification window to the login screen; a separate fresh anonymous API request returned 401. The agent did not choose/send a password or reset email, inspect credentials or export authentication state. Monitoring remains manual; independent backups and bounded maintenance are documented.

## Final review-fix verification — 2026-11-01

At candidate `8a7c0fdae78996200b482c090ad87b4b172f566a`, the new real HTTP/S3 archive-cleanup race passed **1/1**, including exact downloaded archive/original bytes. The six central new recovery/address browser cases passed **6/6** across desktop and mobile in 1.8 minutes: newest source bytes with later-copy preservation, protection of current unsaved/in-flight/conflicting work, and failed/unfinished page-address recovery after refresh. An initial six-case attempt timed out during a development-server HMR refresh loop; after a clean owned-server restart, the exact newest-source desktop case passed independently and the unchanged six-case suite passed. No assertions or application source were changed for this rerun.

The owned development server was stopped before final TypeScript, repository formatting and production-build checks; all passed. Production build regenerated `next-env.d.ts` back to its tracked production paths. These targeted checks supplement the full 60-API/96-browser baseline above and the fixer's 52-browser/12-API affected suite; they do not claim a repeated complete matrix at the final candidate. Local fixtures remained on loopback `garden_ticket13`/port 3013/private S3 59013–59014. Logs and traces remain outside the watched checkout in shared `ticket13/` artifacts. No hosted fixture, owner-email or password actions were taken.


## Managed SDK runtime correction — 2026-11-01

The first release, `dpl_9BLFfk6WruHfUMNpXZVZhXdnk5Dr`, reached READY on main `6847e170112843cc8c0b139696055b9760e9a5df`, production target, Node.js 24 and Singapore `sin1`, with the canonical alias assigned. Anonymous home/sign-in/recovery forms returned 200 without a Vercel login wall, but the missing-page check returned 500. Runtime logs identify `cookies.sessionDataTtl must be a positive number (in seconds)`: the pinned Neon SDK rejects the adapter's zero value before any auth request. Local Better Auth coverage did not exercise that managed constructor. Owner interaction was held at this failing gate.

The correction omits the invalid TTL and calls the supported `getSession({query:{disableCookieCache:"true"}})` for every administrator authorization. The SDK's normal signed-cookie lifetime can remain its default; authorization explicitly bypasses that cache and still checks the immutable administrator allowlist. A new `npm run test:neon` regression runs the actual built Next.js application in production/Neon mode against a loopback auth service and isolated local database, without real credentials or hosted mutations. It reproduced the exact missing-page 500 before the fix and passes after: missing-page 404, anonymous admin redirect/API 401, SDK-minted signed cached-session access, then immediate API 401 after upstream revocation with the same cached cookie. Both authorized and revoked requests demonstrably reached upstream with `disableCookieCache=true`. Production build, TypeScript and formatting pass.

The owner connected the existing Vercel project to GitHub during release; the connected Git deployment context independently verifies the exact repository link. Previews remain disabled. Verify the next exact pushed main SHA's deployment target before claiming automatic production-branch delivery, and avoid creating a duplicate deployment if Git has already started one. The initial failed deployment remains historical evidence; the post-fix canonical smoke and owner acceptance are still pending.


## Healthy production release — 2026-11-01

Both incremental standards/specification reviews of `abf1725` returned zero findings. The reviewed correction was merged and pushed to main `9e60cfcbda8fe2b04cbdb4863c6506718e64f923`. Its Git push automatically created `dpl_8NF6NtLTDJdmMc2vyGEizsEfb5ME` (`source:git`, `target:production`, `ref:main`, exact SHA matched), which reached READY and assigned `https://our-memory-garden.vercel.app` without alias errors. Functions are in Singapore `sin1`, using Node.js 24. This establishes actual automatic production delivery from main; no duplicate explicit deployment was created. The project inventory contains two production deployments and zero previews.

All **21 anonymous canonical smoke checks passed** after the correction, using plain requests without Vercel bypass, authenticated cookies or share links. They cover public home/sign-in/recovery forms, absent public page 404, absent registration routes, administrator redirects, protected page/media/storage/export API denial, protected-original and manifest/part boundaries, robots/sitemap, managed anonymous session response, and foreign-origin mutation rejection. Responses retain the expected no-store boundaries. No runtime error logs were returned for the corrected deployment in the inspected 15-minute window ending 2026-11-01 15:01 UTC. The old deployment's zero-TTL error remains historical and is not attributed to this healthy candidate.

These checks establish healthy anonymous deployment and access boundaries; they do not establish owner mailbox receipt, password setup, restored managed sessions, private content or authenticated large Vercel streams. The owner-assisted production acceptance remains separate and ticket 13 stays claimed. Detailed smoke output is retained outside the watched checkout under shared `ticket13/production-public-smoke-fixed.log`.


## Owner navigation follow-through — 2026-11-01

The owner's regular Chrome session reached `/admin` successfully, but View website → Garden dashboard led back to the login form. Direct `/admin` navigation remained authenticated, establishing a navigation defect rather than observed session expiry. Both desktop/mobile public-menu links targeted `/login`, and the login page always rendered its form.

A real browser regression reproduced the first failure at the public dashboard link; after correcting that link alone, it separately reproduced the missing redirect on a direct signed-in `/login` visit. Both public-menu links now target `/admin`, whose existing server authorization gate sends anonymous visitors to login. Login checks the current allowlisted administrator and redirects an existing signed-in administrator to `/admin`. The page first awaits Next.js `connection()` so session work runs only for an incoming request, without initializing authentication during prerendering. The managed adapter's fresh upstream session query and immutable administrator allowlist remain the authorization boundary.

The four new desktop/mobile checks pass for signed-in return/direct login and anonymous dashboard entry. The complete affected auth/password-recovery set passes **13 journeys with one intentional desktop-menu skip**. Production build, TypeScript and formatting pass. The actual production-mode pinned Neon SDK regression also passes, now including a signed-in `/login` → `/admin` redirect that demonstrably asks upstream for a fresh session, alongside cached-session revocation denial. All fixtures remain loopback-only; no owner credentials, cookies or browser state were inspected/exported. Both incremental reviews returned zero findings; the resulting main production release is recorded below. Ticket 13 remains claimed until the remaining owner and authenticated data/media acceptance is complete.


## Authenticated production media and backup acceptance — 2026-11-01

With the owner signed into an isolated browser profile through the normal application, approved temporary production checks passed against the canonical origin from 15:17:14 to 15:17:31 UTC. The automation used that context's authenticated request client; no passwords, cookies or browser authentication state were read or exported.

- The managed administrator session returned 200. A real signed upload processed a synthetic **6,763,537-byte PNG**. Its protected original streamed through the deployed Vercel route with an exact SHA-256 match; the same original request was denied anonymously with 404.
- An owned temporary Gallery page was checked across public/private transitions. Public optimized display access returned 200 while the live page was public and 404 after it became private.
- A complete two-part backup reached ready with its manifest. The **6,767,104-byte originals TAR** streamed through the deployed authenticated Vercel route, extracted the exact synthetic original, and supported exact-byte Range resume for bytes 17–1023. Anonymous archive download returned 401. Both original and archive exceed the 4.5 MB boundary.
- Only the owned temporary page/history, photo/original/display and export were cleaned. The normal API removed the temporary page/history and photo; the owned export was cancelled, then the bounded export CLI dry-run/apply removed only its three validated recorded keys. Independent read-only Neon verification confirmed one preserved administrator, the original homepage, zero ready photos and the owned export marked cleaned.

The sanitized result, byte counts, checksums and exact owned export/part identifiers are retained in shared `ticket13/production-owner-api-evidence.json`. These are actual authenticated managed-auth/Vercel/storage results rather than local fixture evidence. The later navigation, editor/session and final manual sign-out acceptance follow below.


## Navigation correction release — 2026-11-01

The reviewed main `a20fdb95db1a26362dc11a8b1d279501e04392a9` automatically produced `dpl_CpM4cBJJxxYKEmZCYby9DAtARP1d` with Git source, production target, Singapore `sin1`, and the canonical alias assigned without errors. Independent remote inspection confirmed both main and integration at that exact SHA. All 21 anonymous canonical checks passed again after this release. No error logs were returned for this deployment in the inspected 15-minute window ending 15:23:55 UTC. The inventory contains three production deployments and zero previews.

The authenticated media/backup acceptance above remains valid: this release only changes dashboard destinations and request-bound login routing. Owner-browser dashboard return, desktop/mobile editor, session restoration and final manual sign-out were subsequently verified below.


## Production desktop/mobile editor and session acceptance — 2026-11-01

On deployed main `a20fdb95db1a26362dc11a8b1d279501e04392a9`, the owner's normal Chrome session was exercised through a separate agent-created tab while their existing homepage editing tab remained untouched. The public Garden dashboard link targeted `/admin` and opened the actual authenticated dashboard; direct navigation to `/login` also returned to `/admin`. Authentication remained valid across the actual desktop/mobile save-and-reload checks.

A private temporary page was created from the Our story template. In the real Puck workspace, nested Section/Columns content was edited through its controls: a Text block was added in the left column, edited, moved up and acknowledged Saved, then persisted through reload on desktop. An Image placeholder in the right column retained its alt text and caption through autosave. At a 390 px browser viewport with the actual Mobile 390 editor canvas selected, the Text block was selected, moved down and edited; Saved acknowledgement and reload confirmed persistence again. The document's scroll width and client width both measured 375 px (the 390 px viewport less the native 15 px scrollbar), with no content outside the viewport. Screenshots of the mobile editor and normal dashboard were inspected and retained as shared `ticket13/production-editor-mobile.jpg` and `ticket13/production-dashboard.jpg`.

The actual History → Trash confirmation → permanent-delete flow removed only the owned temporary page and its history. Independent read-only Neon inspection confirmed that temporary page was absent, the one original homepage remained, and no ready photos were left. The temporary viewport was reset and the agent-created tab was left at the dashboard; the owner's original homepage edits were preserved.

Final sign-out used the separate owned ephemeral Chrome profile, preserving the owner's regular editing session. Its authenticated API status was 200 before the handoff, and the owner then confirmed that the verification window signed out and displayed login. A separate fresh anonymous `/api/pages` request returned 401. The post-handoff request in the same verification context could not complete, so no same-cookie-jar HTTP revocation result or sign-out HTTP status is claimed. The visible login is manual production acceptance: this deployed login page redirects valid administrators to `/admin`. No owner passwords, cookies or browser authentication state were inspected or exported.


## Answer

Deployed and verified [Our Memory Garden](https://our-memory-garden.vercel.app) on the intended existing Vercel project with Neon PostgreSQL, managed authentication and private Object Storage in Singapore. Reviewed pushes to main automatically create production deployments; no preview deployments were created. The accepted application release is main `a20fdb95db1a26362dc11a8b1d279501e04392a9` / `dpl_CpM4cBJJxxYKEmZCYby9DAtARP1d`. All standards/specification findings and the two production auth/navigation follow-ups are fixed, reviewed and covered by regression evidence above.

Completed real public/private/admin production acceptance across desktop and mobile-width browser/editor controls, managed session reloads, manual owner sign-out, photo visibility transitions, exact authenticated original/archive streaming over 4.5 MB, Range resume and safe cleanup of approved temporary content. Preserved the original homepage, administrator and the owner's editing tab. Storage monitoring, private independent backups and bounded maintenance are documented in [production operations](../../../docs/production-operations.md).

Known operational limits remain explicit: monitoring and cleanup are manual, custom SMTP is not configured, backups require downloading independent copies, and no automatic archive importer is provided. The second administrator is deferred until the owner supplies that identity, matching the approved first-owner-only release scope. These do not leave ticket acceptance open. All local tickets 00–13 and the overall specification are resolved.
