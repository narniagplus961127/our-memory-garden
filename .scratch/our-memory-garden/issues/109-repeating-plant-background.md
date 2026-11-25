# 109 — Repeating plant background without side rails

Status: resolved

Remove the reserved artwork margins and content-width cap from public pages and the editor preview. Reuse the existing three plant arrangements as a subtle repeating background across the content area. Preserve transparent defaults, authored colours, full-width sections, readable mobile content and non-interactive decoration.

## Answer

Removed the desktop side-rail calculation, maximum width and centered margins. Public pages and the editor document now use their full available width. A self-contained, repeating SVG tile reuses the three unchanged plant sprites at spaced positions; desktop opacity is 14%, smaller-screen opacity 10%. Decorations remain fixed, behind content and non-interactive. The new versioned tile is 147,354 bytes before HTTP compression and caches immutably for a year. Its generator is `scripts/build-plant-pattern.mjs`. No personal photos, saved content or database schema changed.

## Verification

- Existing focused desktop/mobile plant journeys: 2 passed, including full width, repeated background, no horizontal overflow, source transparency and bounded asset size.
- Inspected desktop/mobile screenshots and a 1920px browser check: page width 1920px, left edge 0px, repeating background, pointer events disabled, no horizontal overflow.
- Local asset HEAD: 200, image/svg+xml, immutable one-year caching.
- Production build (including TypeScript), focused formatting and whitespace checks passed. Browser checks use the development server because local test authentication is deliberately disabled in production mode.

## Limits

Existing explicit section/background colours may cover the decorative background, as intended. Editor fixed positioning is relative to its preview frame. Future changes to the tile require a new versioned filename because it is cached immutably.
