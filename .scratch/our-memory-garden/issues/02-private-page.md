# 02: Create and view a private page

## What to build

Either administrator can sign in, create a private page, edit basic text and view it; visitors cannot access it.

## Blocked by

- 01: Design and approve the Figcraft prototype

## Status

ready-for-agent

## Acceptance criteria

- [ ] Provide separate privately provisioned accounts with password recovery and no public registration.
- [ ] Either administrator can create and edit a private page; anonymous visitors receive not found.
- [ ] Exercise the flow on desktop and mobile against the application and enforce access at the data boundary.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


## Admin screen reference

Use the admin Pages screen as the starting point for creating and accessing private pages.


## Settings design reference

Use the Account settings screen for the signed-in administrator and email-based password reset entry.


This ticket establishes the private page and access boundary with basic text editing. Ticket 04 builds the first Puck editor slice (text, image placeholder, sections/columns and basic auto-save); ticket 09 hardens recovery and conflicts. Media, galleries and page grids follow later.


