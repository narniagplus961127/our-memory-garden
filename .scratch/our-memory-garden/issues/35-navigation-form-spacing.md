# 35 — Consistent navigation form spacing

Status: resolved

The owner reported uneven alignment in the navigation edit form. Match spacing between each field, keep label/control spacing and control dimensions consistent, and check both Garden page and External URL destinations on desktop/mobile. Preserve the dedicated form routes and existing behavior. Record verification, commit and push.

## Answer

The destination picker is a nested grid with an 8 px gap, which compressed the space between Destination type and Garden page/External web address. Browser measurement reproduced field gaps of `[24, 8, 24]` before the fix. A navigation-scoped label margin now supplies the missing 16 px, giving consistent 24 px field separation while retaining 8 px label/control gaps. Reset validation-paragraph margins within this picker to prevent extra spacing. Editor pickers and all form behavior are unchanged.

## Verification

The focused browser measurement failed on the original layout, then both desktop/mobile navigation journeys passed after the correction. Both destination types now verify equal left edges and widths, 44 px control heights, 8 px label gaps, 24 px field gaps and no horizontal overflow. The same journeys exercise create/edit, nesting, keyboard reordering, removal confirmation and public page links. TypeScript, full formatting/whitespace checks and the optimized production build pass. The direct geometry result isolated this small CSS defect without broader instrumentation.

Reviewed application evidence: [Garden page desktop](../../../docs/evidence/ticket35/navigation-page-desktop.png), [mobile](../../../docs/evidence/ticket35/navigation-page-mobile.png), [External URL desktop](../../../docs/evidence/ticket35/navigation-external-desktop.png), [mobile](../../../docs/evidence/ticket35/navigation-external-mobile.png). The spec and application design reference are updated; native FigCraft frames are unchanged for this spacing correction. Authenticated checks use local fixtures; production checks are read-only.
