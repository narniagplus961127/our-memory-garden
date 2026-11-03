# 15: Stabilize the editor toolbar and center its dialogs

## Status

resolved

## Problem

The link dialog appears at the upper-left corner, with uneven field widths and spacing. The formatting row appears/disappears as Puck's contextual menu changes, shifting the canvas while moving between blocks.

## Accepted improvement

The owner requested these fixes on 2026-11-03. Keep a stable formatting row in the existing workspace; enable it for the selected text editor and disable it for non-text selections. Hovering another block must not retarget formatting or move the page. Center the link dialog within the viewport and align its labels, inputs and actions using the existing garden styling. Apply the same positioning correction to the related column/photo dialogs.

## Acceptance criteria

- [x] Selecting text, hovering another block and selecting a photo do not change the canvas's vertical position on desktop or mobile.
- [x] Formatting follows focused text, survives contextual-menu hover changes and stays inactive for non-text selections.
- [x] Link dialog is centered in both axes, responsive and scrollable, with equal field widths and consistent spacing.
- [x] Applying a link retains the selected words, autosaves and survives reload; keyboard and mobile formatting continue to work.
- [x] Update the editor documentation, verify targeted browser journeys and the production build, then commit and push the completed ticket.

## Diagnosis

Browser regressions reproduced a 61 px canvas jump and a dialog center 300 px from the viewport center. The row was conditionally portaled from Puck's hover-dependent menu into an empty host, so removing the menu removed its layout height. Dialog positioning inherited reset margins, and broad toolbar selectors also styled nested dialog fields. A persistent toolbar follows the focused Tiptap editor; native Puck drag/block actions remain independent.

## Verification and review

2026-11-03: 18 desktop/mobile inline-editing and navigation checks passed, followed by six expanded hover/dialog/photo checks. Four final geometry and keyboard cases pass after clearing cancelled link selections; that additional regression first reproduced formatting the whole heading rather than the newly selected final word. Link, column and photo dialog centers stay within 2 px of the viewport center. TypeScript, Prettier and the final optimized build pass. The backend schema and persistence contract are unchanged.

[Standards and Spec review](../../../docs/editor-stability-review.md) found no material issue in the ticket delta. [Desktop evidence](../../../docs/evidence/ticket15/link-desktop.png) and [mobile evidence](../../../docs/evidence/ticket15/link-mobile.png) use local synthetic pages. Delivery follows the owner's standing instruction to push completed tickets and the authorized main/Vercel production workflow.
