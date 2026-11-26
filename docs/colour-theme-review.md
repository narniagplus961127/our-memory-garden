# Garden colour theme review

Reviewed 26 November 2026. Recommendation only; no application styles, saved page content or production configuration were changed.

Implementation follow-up: the user approved this proposal later on 26 November. Ticket 114 applies the refined palette; the findings below retain the original review baseline. The shared implementation is `src/lib/garden-colours.ts`, including both site and editor iframe colours. Existing authored custom hex values are preserved.

## Recommendation

Keep the pixel-garden direction and refine its interface palette. Use a less yellow ivory canvas, white form and modal surfaces, soft sage for supporting areas, and one forest green for main actions. Keep the wooden boards, pinned paper, fence, plants and pixel font. Their material colours are intentional, rather than palette inconsistencies.

The current dark-green text is already readable: `#2E4630` on the body paper `#FBF3DC` measures about 9.32:1. This is a consistency and hierarchy improvement, not a replacement of an unusable theme.

## Scope and evidence

- Inspected the live public Garden page with an empty search and its open menu; confirmed computed body, header, footer and input colours against source. The empty search avoided downloading the photo collection.
- Reviewed dashboard, shared controls, dialogs and editor styles in source. Authenticated production dashboard/editor screens were not inspected live.
- Built a self-contained interactive comparison with current/refined palettes and public, dashboard and editor examples. These are illustrative previews, not screenshots of authenticated production screens.
- Verified both palettes and all three examples at 320, 375, 736 and 1024 pixels: 24 combinations without horizontal document overflow, with the actual pixel font loaded. Menu toggling worked and the preview reported no browser errors or warnings. Visually inspected the recommended public and dashboard examples.

## Findings

| Priority | Finding | Evidence | Recommended change |
| --- | --- | --- | --- |
| High | Named backgrounds differ between the editor and the theme. | `src/app/globals.css:274` defines Paper `#FBF3DC`, Sage `#EDF2DC`; `src/components/background-colour.tsx:36` offers Paper `#FFFCF5`, Sage `#E0E7D9`, Clay `#E5C7B7`. Section Clay has another value. | Give each preset one canonical definition and use it consistently in controls and rendering. Preserve existing saved hex values. |
| High | Two button variants communicate a main action differently. | `src/components/ui/button.tsx:11` uses pale `bg-primary` by default; line 12 uses dark `bg-foreground` for the variant named `primary`. | Use forest green for the main action, white/outline for secondary actions and ghost styling for small controls. Audit callers by purpose before changing defaults. Keep the white Photo Grid Load more control on wood. |
| Medium | The editor maintains a separate set of greens. | `src/components/editor.css:7` overrides the canvas and leaf colour and defines separate Puck selection colours. | Map editor canvas, panels, selections and focus to shared semantic roles. Keep selected labels dark on light sage. |
| Medium | Error styling uses different families. | Inline errors use peach/brown in `src/app/globals.css:460`; toast errors use Clay at line 2466; destructive controls use red. | Share an error colour and pale error fill; keep text/icon cues so colour is not the only signal. Clay remains a decorative material colour. |
| Medium | Some input boundaries are subtle. | Current input edge `#9DB17E` against cream `#FFF8E7` measures about 2.20:1. | Use a stronger dedicated input edge and visible keyboard focus. General decorative dividers can stay lighter. |
| Low | Dark greens drift across footer, text and editor. | Footer `#304F39` at `src/app/pixel-theme.css:99`, ink `#2E4630`, plus editor-specific greens. | Assign explicit text, main action and supporting colour roles rather than selecting another near-identical green for each component. |

## Proposed roles

| Role | Proposed colour | Use |
| --- | --- | --- |
| Page canvas | `#FAF8F1` | Public and admin page background |
| Surface | `#FFFFFF` | Inputs, panels, dialogs and secondary buttons |
| Forest | `#355641` | Main actions and footer; white foreground |
| Text | `#2D4032` | Body text and headings |
| Muted text | `#596B59` | Supporting text |
| Soft sage | `#E5EDDF` | Sidebar, selected/supporting surfaces |
| Separator | `#CDD8C5` | Decorative dividers and panel separation |
| Input edge | `#7C8F73` | Identifiable field boundaries |
| Focus | `#5B7B4B` | Keyboard focus indicator |
| Pixel shadow | `#C9D6C1` | Restrained stepped shadows |
| Error/destructive | `#A74435` | Destructive actions and error cues |
| Error text / fill | `#8D3A2D` / `#F8EAE5` | Readable error messages |

Keep the existing wood browns and pinned-paper `#FFF3D8`. A material can remain warm while the surrounding interface becomes more neutral. Custom page backgrounds and the Dark green section preset need deliberate treatment rather than automatic replacement.

Sample sRGB contrast calculations for the proposal:

- Body text on ivory: approximately 10.45:1.
- Muted text on white: approximately 5.72:1.
- White main-action text on forest: approximately 8.21:1.
- Input edge on white: approximately 3.48:1.
- Focus colour against ivory: approximately 4.51:1.

These checks cover sample colour pairs, not a complete accessibility audit. WCAG specifies 4.5:1 for normal text and 3:1 for qualifying large text; required non-text identification and state cues generally need 3:1 against adjacent colours. This does not mean every decorative border needs 3:1. See [W3C text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [W3C non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

## Implementation order if requested

1. Define one canonical role palette; map shadcn tokens and existing garden aliases to it.
2. Audit button callers, selected states, input edges and status components by purpose. Avoid making every toolbar button a dark main action.
3. Replace editor/Puck overrides and background preset duplication with shared roles. Check transparent sections over the repeating artwork.
4. Verify public pages, admin lists, editor, menus, lightbox, dialogs and toasts, including hover, disabled, selected and keyboard-focus states on mobile and desktop.
5. Preserve all saved page/template custom hex colours and existing material artwork. A site-wide token update must not silently rewrite users' content.

## Comparison

The local comparison is at `C:/Users/QW/.codex/visualizations/2026/10/28/01a1818b-b61d-7d30-b067-bc8107dbaffb/garden-colour-review.html` and is presented inline in the chat. It is self-contained and makes no backend requests. It is intentionally kept outside the repository; the report records the reviewed colours and recommendations.
