# 119 — Compact text selectors and promote common formatting actions

Status: resolved

Make the visual editor's heading and font selectors smaller so italic, underline and left/centre/right alignment fit directly in the main formatting row. Keep spacing and reset options in More formatting. Preserve text selection, formatting commands, autosave, touch targets and horizontal access on small screens. Commit, push and deploy with the approved export removal.

## Answer

The text-style selector is 88px wide and the font selector is 148px wide, both with 13px control text. Widths now apply to the actual shared NativeSelect wrappers; the old direct-select rules did not constrain those wrappers. Italic, underline and all three alignment controls sit directly beside Bold in the main row, with standard alignment icons. More formatting retains letter/line spacing and appearance reset. Page content font sizes and headings are unchanged.

## Verification

- Six existing desktop/mobile browser checks passed: direct text formatting and save/reload/public rendering; formatting-only conflict comparison; and canvas position/selection stability.
- Manual browser check at 1440, 1024, 390 and 320px verified one toolbar row, 44px button targets and no page overflow. At 1440px all controls fit without scrolling. Smaller screens scroll the toolbar horizontally; the canvas does not widen.
- Applied italic, underline and left/centre/right alignment from the main row; confirmed saved rich text retains the marks and alignment. Visually inspected desktop and mobile toolbar screenshots; browser reported zero errors.
- Final combined production build, TypeScript, changed-file formatting and diff checks passed, including ticket 118's retired export routes.

## Limitations

The main row uses horizontal scrolling when it cannot fit while preserving touch targets. The advanced spacing/reset popup remains available through the sticky More formatting button.
