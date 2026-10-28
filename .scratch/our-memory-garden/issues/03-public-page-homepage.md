# 03: Publish a page and edit the homepage

## What to build

Administrators can change page visibility and edit the always-public homepage; visitors see saved public content.

## Blocked by

- 02: Create and view a private page

## Status

ready-for-agent

## Acceptance criteria

- [ ] Switch a page between public and private and enforce access when its state changes.
- [ ] Edit the homepage as a page and display saved content publicly.
- [ ] Keep the homepage public and ensure both administrators can access private pages.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


## Settings design reference

Use the Homepage settings screen for selecting a public page as the homepage and retaining deletion protection.


This slice establishes page visibility and the always-public homepage using the editing capability available after ticket 02. The shared Puck block editor for the homepage arrives in ticket 04; do not assume photo uploads or galleries exist here.

