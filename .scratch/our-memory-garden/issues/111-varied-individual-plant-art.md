# 111 — Consistent individual plant artwork and varied pots

Status: resolved

Replace the repeating background's paired arrangements with more varied individual potted plants. Give all sprites a consistent display size, varied plant silhouettes and clearly different pot designs. Retain the full-width subtle repeating background, transparent output, mobile readability, pointer safety and immutable versioned caching. No saved page-content changes.

## Answer

Generated six individual plants using the built-in image generation tool: fern/terracotta, snake plant/carved ivory ceramic, monstera/woven basket, succulent/faceted sage bowl, flowering cactus/mustard glazed feet, and orchid/rounded rose ceramic. The original transparent atlas remains at its generated source location. All six final WebPs are saved in `public/brand/` and documented with their generation prompt in `docs/individual-plant-artwork.md`.

The export pipeline measures visible alpha bounds, preserves proportions, normalizes each sprite to 192px visible height and centers it on a 224px transparent canvas. All six occupy the same 112px square box in the repeating tile. The mobile tile fits the viewport and scales all sprites equally. The new version 2 tile has six distinct designs, is 114,154 bytes before compression, and embeds 84,980 bytes of WebP artwork. Old immutable assets remain available for prior deployments. No saved content or personal media changed.

## Verification

- Measured every exported sprite: 224 × 224 with alpha and exactly 192px visible height; inspected a paper-background contact sheet.
- Existing focused desktop/mobile background journeys: 2 passed. Mobile recheck after fitting the tile to viewport width: 1 passed.
- Verified six equal SVG display boxes, source dimensions/transparency, bounded payload, full page width, repeating decoration, pointer safety and no horizontal overflow. Inspected rendered screenshots.
- Local HEAD checks for all six sprites and the tile: 200 with immutable one-year caching.
- Production build including TypeScript, focused formatting and whitespace checks passed.

## Limits

Different plant silhouettes retain their natural proportions, so widths vary within the equal-height canvas. Explicit section backgrounds may cover the decorative layer. Editor positioning is relative to its preview frame. Future asset changes require new immutable filenames.
