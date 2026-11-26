# 123 — Review shared design for a consistent garden theme

Status: resolved

Review the public site, navigation, dashboard, media/dialog surfaces and visual editor. Refine shared colours and chrome to match the existing pixel garden: warm cream, forest green, sage and wooden navigation details. Preserve authored content styling, image rendering, transparent section defaults, accessibility and mobile behavior. Include the earlier requests in ticket 122; publish under standing authorization.

## Answer

- Added shared warm-panel (`#fffaf0`) and parchment (`#fff3d8`) roles. Headers, fields, cards, dropdowns and dialogs now use consistent warm surfaces while forest/sage roles and white primary-action text remain intact. Shared variables also reach the editor iframe.
- Reused the existing wooden-sign SVG for public menu opening/closing and mobile dashboard menu controls. Scoped styling to the trigger's class rather than assuming it keeps `data-slot="button"`; the Sheet trigger supplies its own marker.
- Reused the seedling logo for empty cover and starter-template photo placeholders instead of unrelated decorative glyphs.
- Matched the editor's badge and mobile panel corners to the 2px pixel treatment; mobile panel shadow uses the shared garden shadow.
- Removed full-image caption side padding inside swipers: inherited full-page gutters squeezed narrow slide captions to one or two words per line.
- Existing transparent content defaults, custom inline colours, responsive image sources, photo visibility and page data remain unchanged. No extra artwork or dependencies added.

## Verification

Reviewed desktop overview, pages, templates, categories, navigation, media library, photo details, settings and editor; reviewed mobile dashboard/public/swiper/menu layouts. The five remaining dashboard routes had no horizontal overflow at 1280px. Checks used local fixtures and synthetic photos.

Ten desktop/mobile behavior checks passed across editor stability, swiper creation/import/pagination/touch, navigation forms and public menu behavior, and text/button page links. The older navigation check initially selected a fixture outside the first page of the paginated picker; it now searches for that fixture and measures label spacing against the picker group. The eight other checks passed, followed by both corrected navigation cases.

Browser checks confirmed the restored controls, 6px lift and reduced-motion behavior. The wooden trigger and close button preserve 44px targets and open/close correctly. Core text contrast ratios: forest on cream 10.67:1, muted on cream 5.50:1, white on forest 8.21:1, cream on the wood base 5.49:1.

Formatting and production build/type checks pass. Temporary review sessions and captures are removed after verification.

## Limitations

This is a shared-component consistency pass. Authored page colours, spacing and content retain precedence; it does not rewrite individual page designs. Contrast measurements cover the main solid colour pairs, not every user-authored combination or each pixel of decorative artwork.
