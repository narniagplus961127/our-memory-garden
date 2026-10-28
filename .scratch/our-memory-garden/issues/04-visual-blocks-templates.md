# 04: Build pages with visual blocks and templates

## What to build

Compose pages using prepared templates and a responsive visual editor with a live preview.

## Blocked by

- 02: Create and view a private page
- 03: Publish a page and edit the homepage

## Status

ready-for-agent

## Acceptance criteria

- [ ] Create a page from a template and change it independently of the template.
- [ ] Add, edit, remove and reorder banner and text blocks with live preview.
- [ ] Support drag and move-up/down controls with usable mobile editing and automatic saving.

## Design reference

Follow the owner-approved desktop and mobile screens and General styles & brand in the project FigCraft document. Preserve the public/admin visual distinction and relevant component styles. If this ticket requires an unillustrated screen or state, resolve the design gap before implementing that behavior; retain the specification's functional and privacy requirements.


## Editor layout and behavior

- [ ] Use the FigCraft block palette, contextual settings and large page canvas on desktop, and a touch-friendly opening content/settings panel on mobile.
- [ ] Add and configure text, banner, image and button blocks; allow sections and columns as layout containers. Gallery and page-grid behavior is covered by tickets 06 and 07.
- [ ] Select a block to edit content and style, reorder by dragging or move controls, duplicate and remove it.
- [ ] Include desktop/mobile canvas view controls; show visibility and auto-save status in the editor bar.
- [ ] Use the same editor for the homepage and maintain the existing public/private and automatic-save rules.


The canvas is the live editing view; do not add a separate Preview button. Clearly distinguish unsaved or failed changes from saved changes.



Undo and redo controls are out of scope. Page version history and restoration are covered by ticket 10.


## Puck integration

- [ ] Integrate the open-source Puck React editor and register the garden's own page blocks and layout components.
- [ ] Match the approved FigCraft palette, canvas and selected-block settings; keep public rendering based on the same block components.
- [ ] Validate mobile tap-to-add and non-drag ordering, nested layouts, device views and auto-save integration before declaring the slice complete.
- [ ] Keep separate Preview, Publish, undo and redo controls out of the custom editor UI; page history remains in ticket 10.


Basic authenticated auto-save belongs in this slice so the editor is usable. The image block may initially use a placeholder; actual upload and secure photo handling belong to ticket 05. Ticket 09 adds and verifies robust offline recovery and concurrent-edit resolution; do not represent those guarantees as complete before ticket 09.

