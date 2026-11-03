# Website UI and UX review — 3 November 2026

## Assessment

Keep the soft botanical palette, Georgia/Arial typography, fluid page canvas and distinct sage administration area. The useful next step is clearer navigation and content management, rather than a new visual theme. These findings are recommendations; the wider website layout was not changed during this review.

Reviewed the live public homepage, mobile public menu and anonymous login entry; the local desktop/mobile dashboard, page list, settings and media workspace; and the editor's complete text/spacing flow. Navigation and settings subpage recommendations also use source inspection. Responsive checks used 1280×800 and 390×844. Fixture pages and photo filenames are synthetic; their counts are not production usage. The local photo-object service was not running, so missing fixture thumbnails are excluded from findings.

## Prioritized findings

| Priority                       | Finding and evidence                                                                                                                                                                                                                                                                                                                       | Recommended improvement                                                                                                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — functional                 | **Mobile administration menu stays open after navigation.** Open the dashboard menu and select Settings: the URL becomes `/admin/settings`, but the `<details>` remains open and its panel covers the heading and first settings card. Reproduced in the browser; `admin-shell.tsx` has no route-change dismissal.                         | Close the disclosure after selecting a destination or changing route. Give mobile links full 44 px hit areas and constrain/scroll the menu on short screens. Keep the active destination visibly indicated.                                                            |
| 1 — usability as content grows | **Pages has no search, filters or pagination.** `admin/pages/page.tsx` renders all results from `listPages`, which retrieves every non-deleted page and its content. The synthetic fixture displayed 594 cards and a roughly 94,553 px page on mobile. This establishes the long-list behaviour, not a production performance measurement. | Add title search, Public/Private/Homepage filters, category and sort controls, and paginated lightweight summaries. Keep Create page available above the results; retain History and recovery for each page. Follow the existing “Find a photo” pattern.               |
| 2 — content alignment          | **The live homepage's body starts at a different gutter.** Its text block has explicitly saved 9 px padding; the desktop shell/title use 64 px, and mobile uses 28 px. The block's custom setting explains the mismatch.                                                                                                                   | Keep full-width containers and images. Provide an explicit “Use site gutters” reset/preset for text and sections, and show inherited spacing more clearly. Change this particular block only when the owner intends it; avoid overwriting custom page styles globally. |
| 2 — reading comfort            | **Long prose can span the full desktop content width.** The renderer allows a fluid Text block and does not offer a separate reading measure.                                                                                                                                                                                              | Offer an optional “Comfortable reading width” setting on Text blocks, approximately 65–75 characters, with left/centre alignment. This is a text option; the page, banners and images stay fluid/full width. Test it with real multi-paragraph writing.                |
| 2 — action hierarchy           | **Main actions use the same pale button treatment as many secondary controls.** Create a page, Sign in and minor actions have limited visual differentiation.                                                                                                                                                                              | Use the existing forest fill and light text for each screen's primary action, cream outlined secondary actions and quiet text navigation. Preserve adequate focus/disabled states. This is hierarchy, not a new colour palette.                                        |
| 2 — settings wayfinding        | **Return navigation differs between settings screens.** Homepage has a “← Settings” link; Account has no equivalent, and Storage/Export are separate components. The mobile navigation issue makes this more noticeable.                                                                                                                   | Use a shared “Settings / section” breadcrumb and consistent heading/actions on Homepage, Storage, Export and Account. On wide screens the overview could use a modest two-column card grid; keep a single column on phones.                                            |
| 2 — keyboard access            | **No skip-to-content entry point in the shared shells.** Root layout, public header and admin shell provide no skip link, so keyboard users repeat navigation before reaching content.                                                                                                                                                     | Add a focus-visible skip link to a focusable main-content target. Retain the existing visible focus rings and reduced-motion rules.                                                                                                                                    |
| 3 — navigation editing         | **On mobile, Add menu item follows the entire existing menu tree.** This follows DOM order when the navigation workspace collapses to one column. Source-reviewed, not timed in a user study.                                                                                                                                              | Put an Add item shortcut near the heading, open a clearly labelled form/sheet and return focus to the saved item. Maintain the existing non-drag reorder actions.                                                                                                      |

## What already works

During this review, the editor's closed-sidebar state was found to allocate zero width to its desktop canvas. Ticket 19 fixes the grid placement and adds a browser regression, alongside the owner-requested compact toolbar, fonts and line height. The wider website recommendations above remain unimplemented.

- The public and admin surfaces have a recognizable relationship while the sage dashboard is easy to distinguish.
- Reviewed mobile screens fit their width; the public menu and colour dialog provide clear dismissal controls.
- Login has labelled fields, password-manager autocomplete and a recovery link without public registration.
- Media has filename search, upload status/retry, privacy/usage information and useful empty-state text.
- Page visibility is labelled, private links return not found for visitors, and the homepage remains public.
- The desktop sidebar now scrolls independently with its account/footer actions pinned to the viewport.
- The editor keeps stable toolbar space, on-canvas writing, autosave/recovery and touch/keyboard movement alternatives.

## Suggested order

1. Fix mobile administration menu dismissal and target sizes.
2. Add page search/filtering and bounded results.
3. Improve primary actions, settings breadcrumbs and skip navigation together.
4. Add optional text reading width and a site-gutter preset, reviewing their controls in FigCraft before broader layout changes.

The owner's latest Klaviyo reference and explicit font/line-height choice are handled separately in ticket 19: a compact everyday toolbar plus More formatting. This review does not add comments, registration, marketing tools, Preview, Undo or Redo.

## Evidence

- [Desktop dashboard](evidence/ticket18/dashboard-desktop.png)
- [Mobile menu still open after selecting Settings](evidence/ticket18/mobile-admin-menu-open-after-navigation.png)
- [Live public homepage, desktop](evidence/ticket18/public-home-desktop.png)
- [Live public homepage, mobile](evidence/ticket18/public-home-mobile.png)

Code references: `src/components/admin-shell.tsx`, `src/components/admin-page-cards.tsx`, `src/app/admin/pages/page.tsx`, `src/lib/server/pages.ts`, `src/components/navigation-editor.tsx`, `src/components/brand.tsx`, `src/components/auth-form.tsx`, `src/components/media-library.tsx`, `src/app/globals.css` and settings routes.
