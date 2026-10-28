# Our Memory Garden

A botanical journal for two administrators, with public and private pages and a visual React page editor. The FigCraft design is owner approved. Implementation is being delivered through the local ticket graph on `integration/our-memory-garden`.

## Run locally

Use Node.js 24 and Docker Desktop. Install the pinned packages with `npm ci`.

1. Start PostgreSQL with `docker compose up -d`.
2. Copy `tests/local.env.example` to `.env.local` and `.env.test`. These credentials are for the loopback-only disposable database; never use them on a hosted service.
3. Run `npm run db:migrate` and `npm run db:local-auth`.
4. Run `npm run dev` and open `http://127.0.0.1:3000`.

The local fixture creates two administrator identities and one non-administrator. Their example sign-in details are in the local env example. Local password-reset messages are written to ignored `work/local-mail/` files instead of being sent. The local provider refuses to run in production or against a non-loopback application URL.

## Hosted configuration

Copy `.env.example` to `.env.local` and supply the dedicated Neon PostgreSQL connection, managed Neon Auth URL and a random server-only cookie secret of at least 32 characters. Set `AUTH_MODE=neon` and `NEXT_PUBLIC_APP_URL` to the exact application origin. Database and authentication credentials must stay server-side.

Apply checked-in SQL with `npm run db:migrate`. Privately provision an identity using Neon Auth, then run `node --env-file=.env.local scripts/provision-admin.mjs USER_ID EMAIL` with its immutable identity ID. The allowlist supports up to two garden administrators. Do not auto-enroll accounts from email addresses or user-supplied metadata.

The application exposes no registration page or sign-up proxy. Managed Neon Auth currently permits direct upstream registration; such identities still have no garden access unless their exact immutable ID is privately allowlisted. The database Data API stays disabled. Password recovery uses the managed provider's email delivery; validate the owner's password-setup flow separately from the local test delivery.

## Validation

- `npm run typecheck`
- `npm run build`
- `npm test` — desktop/mobile browser journeys, automatically starting the local app if necessary.
- `npm run test:api` — real API and database authorization checks; requires the local app running on port 3000.

See `docs/implementation-notes.md` for module boundaries and evidence. The disposable design-phase Puck experiment remains on the prototype branch and is not production application code.

## Design and requirements

- `Our Memory Garden.figcraft` — approved visual reference plus subsequent routine form-state refinements
- `.scratch/our-memory-garden/spec.md` — behavior and security requirements
- `.scratch/our-memory-garden/issues/` — dependency graph and implementation evidence
- `docs/design-spec-review.md` — design review and follow-through
