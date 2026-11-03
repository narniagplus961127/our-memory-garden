# 20 — Header alignment, editor controls and responsive placeholders

Status: resolved

## Request

Correct public menu label alignment, improve editor settings spacing and the font-size control, and keep photo placeholders inside narrow columns and mobile layouts.

## Acceptance

- Public header root-link text aligns with Our garden and the dashboard action.
- Movement settings use consistent label/field spacing and a visible gap before their action.
- Font size uses a compact full-height field with an inline unit, aligned with adjacent toolbar controls; selection and keyboard editing still work.
- Placeholder artwork, label and choose-photo action fit their containing image block on desktop, narrow columns and mobile, in editor and public rendering.

## Verification

- Before fixes, the focused desktop suite reproduced a 4 px header text offset, 12 px font-size input offset and a 569 px placeholder overflowing a 154 px image block. A separate check reproduced the native-property 16 px extra gutter.
- Final layout suite: 5 applicable desktop/mobile cases pass; the desktop-only navigation test is intentionally skipped in the mobile project. Checks cover aligned header text, matching property gutters, full-height font size, spacing before Move, contain-mode sizing, photo-action/block-toolbar non-overlap and anonymous public rendering. Cover mode also passed the earlier five-case run.
- All 14 existing desktop/mobile inline-editor and stability cases pass in the final complete run. Typography, caret/composition, column preservation, metadata, recovery and dialog behaviour remain covered.
- An initial full run had one third-column placement failure. Its isolated rerun and three repetitions passed; an explicit insertion-location assertion was added before column reduction, and the final full 14-case run passed. Column insertion logic was not changed.
- TypeScript, Prettier and optimized production build pass. No database migration or dependency additions.

## Answer

Public root links share a 48 px text row. The editor uses Puck's supported fields override and `wrapFields={false}` for matching gutters, with 8 px label/field gaps and 16 px separation before the move action. Font size is a 44 px compact control with an inline unit and accessible label. The placeholder's explicit width and container-responsive height/artwork/padding prevent its former aspect-ratio minimum-width expansion; photo actions sit below narrow/mobile images and avoid floating block controls. Existing data and uploaded photos are unchanged.

Updated interaction notes and spec record this correction to the approved layout. Browser screenshots use local synthetic content: [desktop placeholder](../../../docs/evidence/ticket20/placeholder-desktop.png), [desktop settings](../../../docs/evidence/ticket20/settings-desktop.png), [mobile settings](../../../docs/evidence/ticket20/settings-mobile.png), [mobile placeholder](../../../docs/evidence/ticket20/placeholder-mobile.png).
