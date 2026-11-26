# 114 — Apply the refined garden palette

Status: resolved

Implement the approved Refined Garden colour proposal from ticket 113 across public pages, administrator screens and editor. Centralize semantic colours, align background presets, buttons, error and focus states. Keep pixel typography, wooden materials and plant artwork. Preserve authored custom colours and page data. Verify responsive screens and deploy after checks under the user's standing authorization.

## Answer

Added a shared semantic palette in `src/lib/garden-colours.ts`, supplied to the site root and editor iframe. shadcn and legacy garden CSS roles now use ivory, white surfaces, forest, muted sage, consistent input/focus boundaries and shared error colours. Paper/Sage/Clay colour controls use that same palette. Main create/save/apply/import actions explicitly use forest; supporting controls stay light. Footer and Dark green sections share forest. Wooden materials, plants and white Photo Grid pagination remain intact. No database migration or production page-content rewrite.

## Verification

- Production build, including TypeScript, passed; focused formatting and whitespace checks passed.
- Local authenticated browser check: Pages, Categories, Navigation, public Garden and editor at 320, 390, 768 and 1440px (20 screens), without horizontal document overflow or page JavaScript errors. Confirmed main-action colours, white input surfaces, stronger input edges and iframe palette. Visually inspected dashboard/editor screenshots.
- Photo-picker modal has white surfaces and dark titles; wooden menu retains its materials over the shared sage background. Both checked in the browser and captured.
- Existing desktop/mobile section layout journey: 2 passed, including readable selected column choices and section settings.
- Existing desktop/mobile button-customisation journey: 2 passed, including autosave, public rendering, invalid colour rejection and reset to forest. Updated existing colour expectations affected by the palette change.
- React changes retain existing state/effect behavior; shared palette values are static, with no new network requests, event listeners or dependencies.

## Limits

Responsive authenticated checks used the local fixture; they did not modify production pages. Sample colour/interaction checks are not a full accessibility audit. Existing saved custom hex colours deliberately retain their appearance. Built-in named presets follow the shared palette. A local development warning about an unused preloaded logo is unrelated to the theme and remains unchanged.
