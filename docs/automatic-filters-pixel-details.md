# Automatic Garden filters and pixel details

Garden year/category selections submit immediately. Search waits 400 ms after the last change, including the browser's clear action; Enter can submit immediately. Chinese composition is allowed to finish before searching. Native Next Form navigation retains the page shell and field focus. Its own responses preserve newer draft input; clear/back navigation cancels queued searches and restores the URL's filters. Entries made before hydration are preserved and applied when handlers attach. Each change returns to page one. A native submit button remains inside `noscript` for browsers without JavaScript.

The existing bounded public queries, descendant categories, homepage/private/trash exclusion and filter-preserving pagination are unchanged. There is no Apply button in the normal interface.

Photo Grid hover uses the independent CSS `scale` property on the complete paper/photo tile, leaving the image transform untouched and preserving entrance animation. Hovered paper stacks above neighbors; editor tiles retain their editing behavior. Reduced motion disables scaling. Live count-up units reuse the versioned wooden plank SVG; timer calculations, second updates, configured colors and digit-motion preferences are unchanged.

Public main backgrounds use three decorative, non-repeating plant arrangements behind content. They never receive pointer events, don't affect layout, and are fainter on mobile. The three 384-pixel transparent WebP exports total about 110 KB and use versioned immutable caching. No library photo or original storage objects were changed.

## Plant artwork

Created using the built-in image generation tool, then exported for the web with alpha preserved. The generated source images remain outside the repository; only optimized assets are shipped.

| Arrangement | Final project asset | Web bytes |
| --- | --- | ---: |
| Fern and succulent | [garden-pots-v1.webp](../public/brand/garden-pots-v1.webp) | 41,368 |
| Monstera and snake plant | [garden-pots-upright-v1.webp](../public/brand/garden-pots-upright-v1.webp) | 40,822 |
| Bonsai and trailing vine | [garden-pots-trailing-v1.webp](../public/brand/garden-pots-trailing-v1.webp) | 27,976 |

Prompt 1: Create one original small game UI decoration for a cozy pixel-art memory garden website: a compact group of TWO potted houseplants standing together, one taller leafy fern in a warm terracotta pot and one smaller rounded succulent in a muted moss-green ceramic pot. Genuine transparent background with preserved alpha, no ground rectangle, no white backdrop, no text, no watermark, no scenery. Entire plants and pots visible with small transparent padding, centered compact composition, both on the same baseline. Refined nostalgic 32-bit/16-bit garden game pixel art: crisp square pixel clusters, detailed leaf silhouettes, olive/sage/forest green leaves, warm brown soil, subtle cream highlights, restrained earthy palette. Slight top-down three-quarter game-sprite perspective, original shapes rather than copying any existing sprite sheet. The plants should remain clear when rendered about 100-160 CSS pixels wide; avoid blurry painting, thin antialiased outlines, neon colors, huge shadows or photorealism. Output a single ready-to-use transparent raster asset, not a sprite sheet.

Prompt 2: Create one ORIGINAL compact transparent game-decoration asset: a broad-leaf monstera houseplant in a warm off-white ceramic pot next to a shorter snake plant in a muted terracotta pot. Two whole potted plants on the same baseline, centered, no clipping. Refined nostalgic cozy 32-bit garden-game pixel art, clearly stepped square-pixel silhouettes and leaf highlights, earthy olive/sage/forest green foliage, restrained cream and warm brown pottery, slightly top-down three-quarter game-sprite perspective. Detailed but readable when displayed 100-160 CSS pixels wide. Genuine transparent alpha, small transparent padding, no backdrop, no ground rectangle, no scenery, no text, no watermarks, not a sprite sheet. Match a gentle sunlit memory-garden website. Avoid photorealism, blurry painting, neon colors, large shadows, decorative writing or extra objects.

Prompt 3: Create one ORIGINAL compact transparent game-decoration asset: a small sculptural bonsai tree in a muted moss-green round pot next to a trailing pothos vine spilling gently from a simple warm taupe ceramic pot. Two entire potted plants standing on the same baseline, centered with no clipping. Refined nostalgic cozy 32-bit garden-game pixel art with crisp square-pixel leaf clusters and stepped silhouettes, earthy olive/sage/forest green foliage, small cream highlights and warm brown soil. Slight top-down three-quarter game-sprite perspective. Detailed but clear at 100-160 CSS pixels wide. Genuine transparent alpha background and small transparent padding. No background scene, no ground rectangle, no text, no watermark, no sprite sheet, no decorative writing, no photorealism or blurry painting. Match a gentle sunlit memory-garden website.

The final third variant used a cleanup edit: Keep the exact two pixel-art potted plants, bonsai and trailing vine, their foliage, pots, shape and colors. Remove the ENTIRE background and every green glow/halo/shadow around them, including between the leaves and outside their crisp silhouettes. Output only clean pixel plant-and-pot cutouts on genuinely transparent alpha. No new backdrop, no glow, no ambient haze, no shadow, no color wash, no ground surface, no text. Do not change the plants or pottery.

## Verification

Local browser checks cover automatic filter submission, delayed responses/newer typing, focus, Chinese composition, clear/back/pagination, public privacy, paper hover/reduced motion, counter updates, responsive layouts, viewer access, transparent asset size and decorative pointer behavior. Hosted release checks inspect the public markup, CSS and asset headers; authenticated editing is verified with isolated local services.

