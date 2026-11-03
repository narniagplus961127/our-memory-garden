# 19 — Compact formatting toolbar, fonts and line height

Status: resolved

## Request

Use the owner's latest Klaviyo toolbar screenshot as the UI reference. The owner explicitly selected “Add fonts and line height too.”

## Acceptance

- Keep Body/H1–H4/Small, font family, size, colour, Bold and Link in a compact stable row.
- Group italic, underline, alignment, letter spacing, line height and reset in an anchored More formatting popover. It stays within the viewport, dismisses with Escape/outside click, has a labelled close control and does not shift the canvas.
- Offer Site default, Arial, Helvetica, Georgia and Verdana without remote font loading. Font changes affect selected text; blank restores the inherited font.
- Apply unitless line height from 1–3 to the selected paragraph/heading. Blank restores the inherited line height.
- Preserve selection, autosave, safe server validation, mobile access and existing recovery. Do not introduce Preview, Undo or Redo.

## Verification

- Complete 14-case desktop/mobile inline editing, composition, conflict and dialog suite passed after adding fonts and paragraph line height.
- Final four-case focused rerun passed after popover placement/focus changes: safe persisted typography and four-side spacing, stable canvas, viewport-bounded popover, Escape focus return and outside-click dismissal on desktop/mobile.
- The closed-sidebar regression first failed with canvas width 0, then passed after assigning the canvas to the third desktop grid column. The same stability check runs on both devices.
- Three block API cases pass, including supported font/line-height public rendering and rejection of unknown font names, CSS URLs, out-of-range line height and unsupported style properties.
- TypeScript, Prettier and optimized production build pass. No dependency additions or database migration.
- Manual local-fixture UI checks cover 1280×800, 390×844 and 390×420. An open menu repositions on resize; on the short mobile viewport it occupies y≈68–412 and remains inside the 420 px height. The native picker and installed-font rendering remain device-dependent.

## Delivery

The spec and editor interaction notes document the latest owner-requested controls. Native FigCraft frames have not been redrawn in this refinement; current evidence is [desktop](../../../docs/evidence/ticket19/toolbar-desktop.png) and [mobile](../../../docs/evidence/ticket19/toolbar-mobile.png). The separate overall website recommendations are recorded in ticket 18.
