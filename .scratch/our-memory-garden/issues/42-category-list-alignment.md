# 42 — Simplify the Categories list

Status: resolved

Remove the website-address link from each Categories-list card. Keep the category name and right-edge edit/delete icons, with consistent side padding and vertical alignment on desktop/mobile. Long names should wrap without moving the action column. Address editing remains in the category form.

## Answer

Removed the address/view link from each card. The name and action group now occupy a flexible/fixed grid, vertically centred with a 16 px gap and equal 16 px card padding. Long names wrap within the name column; edit/delete retain 44 px targets at the right edge.

Both existing category-form browser journeys pass on desktop/mobile, including edit, duplicate handling and Cancel. Reviewed the resulting list screenshots at both widths. TypeScript, formatting, whitespace and optimized production build pass. No database or destination behavior changes.

Evidence: [desktop](../../../docs/evidence/ticket42/category-list-desktop.png), [mobile](../../../docs/evidence/ticket42/category-list-mobile.png). The design-state reference records this refinement; native FigCraft frames were not redrawn.
