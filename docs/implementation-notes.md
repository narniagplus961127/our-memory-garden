# Implementation notes

## Ticket 02 foundation

The app uses Next.js 16 App Router, React, TypeScript and Tailwind. Public surfaces use parchment; the admin shell uses sage with a 240 px desktop sidebar and equal 64 px insets. Mobile uses 28 px gutters and a collapsible admin menu. Basic text editing is intentionally temporary until ticket 04's Puck editor.

`src/lib/pages.ts` defines a serializable Puck-compatible page document. `src/lib/server/pages.ts` owns parameterized PostgreSQL queries. The browser never receives a database connection or direct data-API capability. Route handlers validate server sessions and immutable-ID administrator membership before mutation; page reads filter visibility at this server data boundary. All content responses use no-store. Text is rendered with React escaping.

`src/lib/server/auth.ts` separates managed Neon Auth from the explicit local Better Auth test provider. The managed adapter uses pinned `@neondatabase/auth/next/server` handlers and `getSession()`. The local provider uses real Better Auth sessions and PostgreSQL, not a browser identity bypass. Unknown identity IDs remain unauthorized even if the upstream provider allows them to register. The garden auth proxy only exposes sign in, sign out, session and password recovery endpoints. Cross-origin mutations are rejected against the configured canonical application origin.

Managed environment keys are `DATABASE_URL`, `AUTH_MODE=neon`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` and `NEXT_PUBLIC_APP_URL`. The older local fixture names AUTH_PROVIDER/NEXT_PUBLIC_SITE_URL are accepted only as configuration aliases. The cookie secret must be at least 32 random characters. Local fixtures are not used for hosted provisioning.

## Test evidence

Ticket 02's two service tests exercise real local HTTP authentication, PostgreSQL persistence, shared administrator editing, anonymous not-found, non-administrator denial, disabled public registration, cross-origin denial and stale-version protection. Six browser tests cover sign-in/recovery entry, one-time password reset and private-page editing on desktop and mobile. Reset delivery is a local mail-boundary fixture; this does not establish managed email deliverability or owner password setup.

The dedicated Singapore Neon schema was inspected before applying `db/migrations/0001-private-pages.sql`. The first privately provisioned owner ID was added to the administrator allowlist; no password reset email was sent by this ticket. A second real administrator can be provisioned later as requested. End-to-end managed-auth owner sign-in remains for the owner setup/deployment verification.

## Design follow-through

Ticket 02 adds six FigCraft account states: desktop/mobile reset confirmation, new password and reset error, using the approved palette, typography, gutters and fields. The reset entry points now link to neutral confirmation. The mobile new-password render was inspected without clipping. The initial text editor follows the approved editor toolbar and form components; ticket 04 replaces its textarea canvas with Puck.

## Dependencies and tooling

Packages are pinned and the lockfile is committed. Neon Auth 0.7.0-beta currently pins a transitive Better Auth version with known high/critical advisories. The package overrides select the already-pinned patched Better Auth 1.7.14 and Zod 4.6.7; authentication tests, typecheck and build must pass after this change. Seven low-severity advisories remain in the SDK's unused auth-UI/react-email/html-to-text/deepmerge dependency chain; no patch for deepmerge is published. The application uses its own forms and does not execute that rendering path.

Next.js 16.4.3 automatically appends its managed documentation pointer to AGENTS.md on development startup. Its source was checked at `node_modules/next/dist/server/lib/generate-agent-files.js`, and the relevant installed route-handler/cookie guides were read. The React review checked guarded server operations, semantic labelled forms, keyboard focus, error/status feedback, responsive navigation and hook cleanup; no UI component library or auth-UI bundle is imported into the custom forms.

## Ticket 03 visibility and homepage

`garden_settings` stores one homepage reference. Its selection trigger locks and validates an available public page; page triggers protect that active page from becoming private, entering trash or being deleted. The application also gives a clear conflict response when an administrator tries to hide the homepage. The first authenticated administrator layout visit initializes a normal public homepage if none is configured. Initialization and selection share a transaction advisory lock to prevent competing initial homepages.

`src/lib/server/homepage.ts` is the server-only homepage boundary. `/api/homepage` returns only the public, non-trashed homepage; its mutation requires the same session, administrator and origin checks as page editing. The ordinary editor submits text and visibility together under a single page version. Both `/` and `/p/[id]` read current saved state dynamically. `GardenPage.is_homepage` is a derived marker, not an editable content property.

The Homepage settings page follows existing desktop/mobile FigCraft frames 955/959: current public page, a public-page picker, the semantic Choose as homepage action, and deletion-protection copy. It reuses the approved fields, cards, colors and responsive gutters. No separate Save, Publish or Preview control was introduced. The current text renderer and basic editor remain temporary until ticket 04's Puck slice.

Eight desktop/mobile browser journeys and five API/database checks passed locally. Ticket 03 adds coverage for immediate visibility transitions, homepage selection and editing, and rejection of hiding/trashing/deleting the current homepage directly at the database boundary. Hosted migration/application verification is separate; apply `db/migrations/0002-homepage.sql` through the checked-in runner before deploying this slice. The runner prefers nonempty `DIRECT_DATABASE_URL` for hosted migrations and falls back to `DATABASE_URL` for local development. Runtime requests continue to use the pooled `DATABASE_URL`.
