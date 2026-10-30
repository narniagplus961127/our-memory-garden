# 06: Create photo galleries

## What to build

Administrators compose photo galleries; visitors view permitted photos at a larger size.

## Blocked by

- 05: Upload and use photos securely

## Status

resolved

## Acceptance criteria

- [x] Add a gallery block with photos and optional captions.
- [x] Open an enlarged photo and move between gallery photos on desktop and mobile.
- [x] Apply the same photo visibility rules as other page content.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


The redesigned editor palette includes this block; follow the approved editor canvas and contextual settings design when adding its controls.

## Answer

Implemented a Gallery Puck block with ordered real library photos, optional escaped captions, add/move/remove controls and recursive validation. Shared public/editor components render a responsive grid and enlarged viewer with previous/next/close, matching caption/count, keyboard arrows/Escape, modal focus containment and focus return. All display URLs use the existing authenticated/public-usage media gateway; originals remain protected. The approved Gallery settings and public viewer contracts are preserved. No database migration is required.

## Verification

Eight local API checks passed across gallery, secure media and recursive blocks, using real PostgreSQL, Better Auth and S3-compatible storage. They establish caption/order persistence, nested references, ready-photo validation, public/private transitions and protected originals. Four desktop/mobile gallery/media browser journeys passed. The final two gallery journeys also verify responsive columns, 44 px controls and keyboard/focus behavior. Production build, TypeScript and formatting checks pass; both viewer screenshots were inspected. See [implementation notes](../../../docs/implementation-notes.md) and [test instructions](../../../tests/README.md).

## Known limitations

Hosted managed-auth and deployed-browser verification remain ticket 13. Local results do not establish those hosted flows.
