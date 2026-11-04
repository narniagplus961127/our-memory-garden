# 33 — Twin-seedling logo and favicon

Status: resolved

The owner chose two small seedlings growing from one curved ground line. Create a simple forest-green vector mark with rounded leaves and slightly different heights, pair it with the existing serif name and update website/admin/mobile branding plus matching favicon/touch icon. Keep the name and homepage link accessible. Export reproducible assets, review large and favicon sizes and check responsive header/admin placement. Update design/spec references, commit and push.

## Verification

Four existing public-header/authenticated-navigation desktop/mobile journeys pass. Visual review covers the desktop sidebar, mobile administration header, 320 px public header, logo preview and 16/32/48 px icon samples. SVG favicon, ICO fallback and Apple touch icon return HTTP 200 through the application and appear in its file-based metadata. ICO entries decode to their expected sizes; the touch icon is an opaque 180 px square. TypeScript, Prettier and whitespace checks pass.

The optimized Next.js production build passes and prerenders the SVG and Apple icon metadata routes.

## Assets and scope

`public/brand/seedlings.svg` is the source of truth. `npm run brand:build` derives the 512 px transparent PNG, SVG favicon, multi-size ICO and phone icon using existing Sharp. [Brand guide](../../../docs/brand.md) records usage and evidence. The site name, wordmark font and homepage link remain intact. The old gate PNG is retained for historical design references; native FigCraft frames have not been redrawn for this increment.

## Answer

The shared Brand component uses the new forest-green twin seedlings, with matching SVG/ICO browser icons and an opaque phone icon. The source vector and PNG export are available as static brand assets.
