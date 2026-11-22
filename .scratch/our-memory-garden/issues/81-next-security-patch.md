# 81 — Apply the Next.js security patch

Status: resolved

The verification build and npm audit on 2026-11-21 flagged Next.js 16.4.3. The production dependency audit reports one moderate vulnerable dependency, with patch 16.4.6 available. Advisories concern cache/root-param isolation, SVG image optimization, Edge response headers and self-hosted fetched responses. This app's use of each affected feature has not been audited; the dependency warning alone does not establish exposure.

Update the pinned Next.js dependency and lockfile, read the current bundled migration/release guidance, and verify public/private pages, managed/local authentication, media responses and production builds. Keep this maintenance follow-up separate from tickets 78–80. Do not disable build security checks or weaken the local-auth production guard to test a build.

## Evidence

`npm audit --omit=dev --json` reports `next`, severity moderate, fixAvailable 16.4.6. The build succeeds after acknowledging the upgrade reminder. No dependency versions were changed in tickets 78–80.

## Resolution — 2026-11-22

Pinned Next.js and its lockfile to 16.4.6. A fresh production-only npm audit reports zero vulnerabilities. Full npm audit still reports development dependency advisories; they are not included in this production patch.

Type checking and the production webpack build passed. The managed Neon SDK production-mode regression passed with local upstream/database fixtures: anonymous access denied, real SDK session cookie issued, administrator access accepted, and revoked upstream sessions denied despite the cached cookie. No hosted credentials or user accounts changed. The sandboxed Turbopack build stalled; webpack completed successfully. Separate media/abuse hardening belongs to tickets 87–88.
