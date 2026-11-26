# 118 — Remove garden and page JSON exports

Status: resolved

The owner confirmed removal of both Settings → Export garden and the editor's Download page JSON. Remove creation, preparation and download routes and unused export implementation. Preserve JSON import, imports from pages/templates, original photo downloads, storage usage and safe cleanup of legacy temporary archives. Do not delete garden content, original photos or history. Commit, push and deploy under standing authorization.

## Answer

Removed the garden export screen, Settings card, archive job/preparation/manifest/part-download routes, export generator and editor JSON download action. Authenticated page JSON GET only serves the retained page/template import pickers; file download requests return 404. JSON upload, page/template content import, History and protected individual original-photo downloads remain available.

Storage UI and measurement now live in dedicated storage modules. Legacy archive bytes remain counted as temporary archives. Existing bounded expiry cleanup, historical database migrations and unexpired photo reservations remain for compatibility; no production data or schema deletion is part of this removal. The photo reservation message no longer asks users to finish or cancel an unavailable export.

## Verification

- TypeScript and focused formatting/diff checks passed.
- Ten service checks passed: retired routes for anonymous/admin callers; page JSON/import compatibility with 103 ordered grid entries; independent page clones; history restoration; template imports; measured storage; current/photo/history deletion and failure/retry boundaries.
- Desktop and mobile Settings/storage checks passed (2); desktop and mobile JSON/page/template content import checks passed (2). Download controls are absent, retired Settings/export returns 404, and original page settings stay intact through content replacement.
- Updated old export-dependent tests to build import fixtures from saved blocks or inspect saved grid entries. Removed archive-generation tests while retaining media, privacy and recovery checks. Corrected an older ambiguous template-picker test selector after template search was added.
- A stale local development cache initially caused repeated browser reloads after route removal. Clearing only the stopped test server's generated dev cache restored interactivity; focused browser checks then passed. Final production build and release verification run with the following toolbar ticket before deployment.

## Limitations

Existing temporary archive objects/records are removed by their original expiry cleanup. An unexpired legacy reservation may still delay photo deletion until expiry (at most 24 hours after its last preparation). No new export job or reservation can be created. Previously downloaded JSON remains importable.

## Production verification follow-up

The first release removed the implementation successfully, but production's unmatched POST fallback rendered the generic not-found HTML with status 200 (`X-Matched-Path: /_not-found`); GET and HEAD returned 404. Added one small optional-catch-all handler for retired `/api/exports` URLs. Every verb returns an explicit 404 with no cache, and HEAD has no body. It does not import authentication, database, storage or export code, so old clients cannot trigger garden rendering or create/download archives. Page JSON import and the compact toolbar are unaffected. Verify the same production GET/POST/HEAD checks after the follow-up deployment.

The follow-up production build, TypeScript, formatting and diff checks passed. Directly exercised all seven supported HTTP handlers: 404/no-store for every method, JSON unavailable response for normal methods and an empty HEAD body. No environment or service connection was required for this check.
