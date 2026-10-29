# 04: Build pages with visual blocks and templates

## What to build

Compose pages using prepared templates and a responsive visual editor with a live preview.

## Blocked by

- 02: Create and view a private page
- 03: Publish a page and edit the homepage

## Status

resolved

## Acceptance criteria

- [x] Create a page from a template and change it independently of the template.
- [x] Add, edit, remove and reorder banner and text blocks with live preview.
- [x] Support drag and move-up/down controls with usable mobile editing and automatic saving.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


## Editor layout and behavior

- [x] Use the FigCraft block palette, contextual settings and large page canvas on desktop, and a touch-friendly opening content/settings panel on mobile.
- [x] Add and configure text, banner, image and button blocks; allow sections and columns as layout containers. Gallery and page-grid behavior is covered by tickets 06 and 07.
- [x] Select a block to edit content and style, reorder by dragging or move controls, duplicate and remove it.
- [x] Include desktop/mobile canvas view controls; show visibility and auto-save status in the editor bar.
- [x] Use the same editor for the homepage and maintain the existing public/private and automatic-save rules.


The canvas is the live editing view; do not add a separate Preview button. Clearly distinguish unsaved or failed changes from saved changes.



Undo and redo controls are out of scope. Page version history and restoration are covered by ticket 10.


## Puck integration

- [x] Integrate the open-source Puck React editor and register the garden's own page blocks and layout components.
- [x] Match the approved FigCraft palette, canvas and selected-block settings; keep public rendering based on the same block components.
- [x] Validate mobile tap-to-add and non-drag ordering, nested layouts, device views and auto-save integration before declaring the slice complete.
- [x] Keep separate Preview, Publish, undo and redo controls out of the custom editor UI; page history remains in ticket 10.


Basic authenticated auto-save belongs in this slice so the editor is usable. The image block may initially use a placeholder; actual upload and secure photo handling belong to ticket 05. Ticket 09 adds and verifies robust offline recovery and concurrent-edit resolution; do not represent those guarantees as complete before ticket 09.


## Comments

### Implementation — 2026-10-29

Pinned Puck 0.23.0 replaces the temporary text editor with the garden's composed workspace. Text, banner, placeholder image, button, section and two-column blocks share their rendering configuration with public pages and the homepage. The content panel supports dragging and explicit tap-to-add targets for every nested slot, including empty sections and either empty column. Contextual settings provide sibling move controls, duplication and removal; duplicate descendants receive independent IDs. Blank, story and journal templates create independent page documents.

The editor includes actual 1280 px desktop and 390 px mobile iframe canvases, visibility and honest automatic-save feedback. Automatic writes are debounced and serialized, keep the newest edit during an in-flight write, and preserve failed changes in the open editor for retry. Recursive server validation rejects unknown blocks, unsafe button destinations, invalid slot content, duplicate IDs and excessive depth/count. The existing administrator, origin, version and homepage-public protections remain in force.

Validation: production build, typecheck, formatting and all six API/service checks passed. The full desktop/mobile suite passed 17 journeys with one intentional mobile drag skip; mobile tap-add and move controls are exercised instead. A browser error assertion first reproduced Puck root selection throwing after top-level removal; excluding the root and resolving a real parent before removal fixed it, with both affected desktop/mobile journeys then passing. Desktop nested drag into an empty column persists after refresh. Device tests inspect actual iframe widths and responsive column counts. Image/button settings appear publicly after automatic saving. Screenshots were inspected at work/ticket04-evidence/editor-desktop.png and editor-mobile.png.

Known limitations: image blocks use a clearly labelled placeholder; uploads and protected photo handling belong to ticket 05. Buttons currently accept validated external addresses; stable garden-page destinations arrive in ticket 08. Ticket 09 owns browser-refresh recovery and concurrent-edit reconciliation; this ticket does not claim those guarantees. Tests use isolated local PostgreSQL and Better Auth, not hosted Neon Auth or production deployment; hosted checks remain in ticket 13. The prior isolated autosave selection failure did not recur in the exact rerun or full desktop/mobile suite.

## Answer

Pages and the homepage now use the same responsive Puck editor and public block components. Templates, nested layouts, touch controls, desktop drag, contextual settings and basic authenticated automatic saving are implemented. See docs/implementation-notes.md and tests/browser/visual-editor.spec.ts for the handoff.