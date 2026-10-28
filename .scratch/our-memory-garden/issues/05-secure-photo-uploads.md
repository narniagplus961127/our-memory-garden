# 05: Upload and use photos securely

## What to build

Upload photos to a shared library and use them on pages with privacy appropriate to their public use.

## Blocked by

- 03: Publish a page and edit the homepage
- 04: Build pages with visual blocks and templates

## Status

ready-for-agent

## Acceptance criteria

- [ ] Upload and reuse a photo in an image block; retain a protected original and serve optimized copies with metadata removed.
- [ ] Restrict private-only photos and originals; mark photos used publicly as publicly accessible.
- [ ] When public use ends, restrict photos with no remaining public use; verify access across visibility changes.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


## Admin screen reference

Follow the Media library screen for the upload and shared-photo entry point.


## Photo detail design

Follow the desktop and mobile Photo details screens for the preview, public-access indicator, page usage, original download and in-use deletion safeguard. Implement and verify private-only and unused-photo states as required by the spec; the illustrated example is not a complete flow.

