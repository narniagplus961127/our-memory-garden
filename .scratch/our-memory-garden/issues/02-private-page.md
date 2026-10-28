# 02: Create and view a private page

## What to build

Either administrator can sign in, create a private page, edit basic text and view it; visitors cannot access it.

## Blocked by

- 01: Design and approve the Figcraft prototype

## Status

resolved

## Acceptance criteria

- [x] Provide separate privately provisioned accounts with password recovery and no public registration.
- [x] Either administrator can create and edit a private page; anonymous visitors receive not found.
- [x] Exercise the flow on desktop and mobile against the application and enforce access at the data boundary.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.

## Admin screen reference

Use the admin Pages screen as the starting point for creating and accessing private pages.

## Settings design reference

Use the Account settings screen for the signed-in administrator and email-based password reset entry.

This ticket establishes the private page and access boundary with basic text editing. Ticket 04 builds the first Puck editor slice (text, image placeholder, sections/columns and basic auto-save); ticket 09 hardens recovery and conflicts. Media, galleries and page grids follow later.

## Comments

### Implementation — 2026-10-29

Implemented the Next.js/React/TypeScript/Tailwind application foundation, garden-themed public/admin shells, email/password sign in, neutral password recovery, one-time reset form, privately provisioned administrator membership, private page creation, basic text auto-save and administrator-only viewing. There is no registration page or sign-up proxy. Server-only PostgreSQL queries enforce page visibility; every mutation verifies the provider session and immutable-ID administrator membership.

Two isolated local administrators exercise equal access through real Better Auth and PostgreSQL. The first real owner identity is privately provisioned and allowlisted in the dedicated Singapore Neon database; the second real account is deferred at the owner's request. No owner password-reset email was sent by this ticket. Managed owner password setup/sign-in and deployment verification remain tracked in ticket 13; local email delivery does not prove managed deliverability.

Validation: six desktop/mobile browser journeys passed, plus two service tests for persistence, anonymous/private not-found, non-administrator denial, unavailable sign-up, CSRF rejection and stale-version protection. Typechecking and a production build passed after patched Better Auth/Zod overrides. The final mobile three-test run was repeated after resuming. No high/critical dependency advisories remain; seven low advisories in the unused auth-UI email-rendering dependency chain are recorded in `docs/implementation-notes.md`.

Six matching desktop/mobile password confirmation, new-password and error states were added to FigCraft, and the mobile new-password render was inspected. The disposable Puck experiment remains recoverable on its prototype branch and is removed from the production integration tree. Puck editing itself begins in ticket 04; robust recovery/conflict resolution remains in ticket 09.

## Answer

Private-page creation, basic editing, password recovery and administrator authorization are implemented and verified locally on desktop/mobile. The hosted schema and first owner allowlist entry are provisioned; production owner sign-in remains an explicit deployment verification item. See `docs/implementation-notes.md` and the checked-in browser/service tests for the implementation handoff.
