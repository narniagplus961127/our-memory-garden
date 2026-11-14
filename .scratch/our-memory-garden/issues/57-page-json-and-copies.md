# 57 — Export and replace editor content

Status: resolved

## Current behavior

[Desktop and mobile FigCraft flows](../../../docs/Page%20content%20import.figcraft) show the two import sources in the same dialog.

- Download page JSON exports the saved editor blocks, including layout, text, styling, media IDs and ordered Photo grid entries. Page metadata and source revision details are excluded.
- Import page content offers Upload JSON and Use another page. It validates editor blocks and their references. After confirmation, it replaces the current editor blocks while preserving the page title, URL, display-title setting, date, category, covers, sharing settings, visibility and homepage assignment. A public page shows the new blocks immediately. Older exports and previous files with metadata remain usable. The page version saved immediately before the replacement can be restored in History.
- Use another page replaces the destination’s blocks with the source’s latest saved content and builds independent Photo grids. The standalone Copy from page action has been removed.

## Verification

Desktop and mobile checked both import sources, JSON download, invalid files, cancel, preserved page title and URL, and removal of the standalone copy action. The API regression covered older exports, cross-page replacement after a destination edit, preserved page settings, independent ordered 103-photo grids, access checks, and History recovery.

## Comments

2026-11-14: Owner approved the FigCraft design, then clarified that importing is a per-page replacement.

Owner refinement 2026-11-14: Import always replaces the current editor content on confirmation. Limit JSON to editor content, remove the standalone Copy from page action, and add Use another page to the import dialog.
