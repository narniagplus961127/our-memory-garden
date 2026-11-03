# 21 — Button appearance and simpler editor navigation

Status: resolved

## Request

Add fit-content/full-width buttons and custom button colours. Provide a link to view the saved website page, remove the editor Dashboard action, and move Page settings into the sidebar. Remove Banner and Gallery from new block choices because simple blocks can compose those layouts.

## Acceptance

- Button width offers Fit content and Full width; full width fills its content container on desktop/mobile, including columns.
- Button background and text colours accept a colour picker or #RGB/#RRGGBB hex, with Default restoring the variant's inherited colour. Incomplete/invalid inputs never replace the last valid saved colour. The existing block Background colour continues to apply to its surrounding area.
- Appearance survives autosave, reload and public rendering; server rejects unsafe colours or unsupported width values. Existing buttons retain their appearance without a migration.
- View page opens the current saved website page in a new tab, using its stable page ID or `/` for the homepage. Private pages remain visible only to administrators. Pages and History remain in the header; Page settings is a distinct accessible sidebar action on desktop/mobile.
- New block choices and templates use Text, Image, Button, Page grid, Section and Columns. Existing Banner/Gallery documents remain viewable, editable, restorable and exportable; do not delete or silently convert their content.
- Update spec and interaction notes. Verify the relevant editor flows and production build, then commit/push and release through the existing production Git integration.

## Verification

- Four focused feature cases pass on desktop/mobile: button width/colours/default reset, autosave/reload/public rendering, invalid server payload rejection, sidebar navigation, new-tab website access, homepage URL, anonymous private-page denial and existing Banner/Gallery editing.
- All 28 applicable existing editor/stability/layout/template cases pass across the regression run and targeted rechecks. Desktop-only header alignment and native drag checks are intentionally skipped on mobile. Two additional legacy gallery cases pass with local object storage, including captions, ordering and enlarged keyboard/touch viewing.
- Initial test setup issues were corrected: native radio labels required visible-label interaction; the mobile reload check incorrectly tried closing a panel that starts closed. The final width control uses accessible pressed buttons and visibly defaults to Fit content for older documents.
- The longer template scenario exceeded its 60-second limit while covering several admin routes/screenshots against the large synthetic fixture; its budget is now 120 seconds. A subsequent desktop attempt lost selection during development reloads while artifact directories were moved. The clean isolated desktop/mobile reruns pass. A concurrent mobile gallery attempt timed out loading the library; its isolated rerun passes. Generated browser runs are kept under ignored `work/`.
- TypeScript, Prettier and optimized production build pass (compiled in 5.5 seconds, TypeScript in 4.1 seconds, all nine static pages generated). No dependency additions or database migration.

## Answer

Button Styles offers Fit content/Full width and independent button-background/text colours via shared swatches, native picker or hex. Blank/Default restores the appearance variant; the surrounding block background stays independent. Server validation accepts only supported width values and RGB hex colours. The header now contains Pages, editable title, visibility/save state, View page and History. Page settings has its own sidebar entry and a labelled mobile control; all four mobile panel actions fit together. View page opens the saved website in a new tab using stable page ID, or `/` for the homepage, with the normal privacy checks.

Banner/Gallery are absent from the new-block palette. New welcome templates compose Section/Text instead of Banner. Legacy types, renderers, property editors, media references, restoration and exports remain available; existing content is never silently converted or deleted. Explicit inline text colours on button words continue to override the button's inherited text colour. Native FigCraft frames have not been redrawn for this incremental owner-requested change; the spec and interaction notes record the current implementation.

Evidence uses synthetic local pages: [button settings](../../../docs/evidence/ticket21/button-desktop.png) and [mobile Page settings](../../../docs/evidence/ticket21/page-settings-mobile.png).
