# Individual plant background artwork

The repeating background uses six individual potted plants with different silhouettes and pottery designs. Each WebP has a transparent 224 × 224 canvas and a normalized visible height of 192 pixels; all six use identical 112 × 112 display boxes in the background tile. Smaller screens scale every sprite equally, with a tile no wider than the viewport so all six designs remain available on phones.

| Plant | Pot design | Asset | Bytes |
| --- | --- | --- | ---: |
| Fern | Rolled-rim terracotta | [Fern](../public/brand/garden-plant-fern-v1.webp) | 18,858 |
| Snake plant | Tall carved ivory ceramic | [Snake plant](../public/brand/garden-plant-snake-v1.webp) | 9,706 |
| Monstera | Woven basket | [Monstera](../public/brand/garden-plant-monstera-v1.webp) | 16,504 |
| Succulent | Faceted sage ceramic bowl | [Succulent](../public/brand/garden-plant-succulent-v1.webp) | 12,570 |
| Flowering cactus | Mustard glazed pot with feet | [Cactus](../public/brand/garden-plant-cactus-v1.webp) | 12,560 |
| Orchid | Rounded dusty-rose ceramic | [Orchid](../public/brand/garden-plant-orchid-v1.webp) | 14,782 |

The [version 2 background tile](../public/brand/garden-plants-pattern-v2.svg) embeds all six sprites and is 114,154 bytes before HTTP compression. It is self-contained because SVGs used as CSS images cannot load external images. The tile and sprites use immutable one-year caching. Original version 1 assets remain available for old deployments; bump the filename version before changing any published immutable asset.

## Generation and export

Generated as one transparent 3 × 2 sprite atlas using the built-in image generation tool. The original generated PNG stays outside the repository; final optimized WebPs and the tile are saved in `public/brand/`.

Export each sprite using `node scripts/build-individual-plants.mjs "<generated transparent atlas PNG>"`, then rebuild the tile with `node scripts/build-plant-pattern.mjs`. Exporting measures the alpha silhouette, ignores nearly invisible alpha noise for bounds, preserves proportions, scales each visible sprite to a common height, centers it on the common transparent canvas and compresses WebP. It does not repaint or replace any artwork.

## Final generation prompt

Use case: stylized-concept. Asset type: ONE production sprite atlas for a cozy pixel-art memory-garden website background. Generate a landscape 3-column by 2-row atlas with exactly SIX distinct SINGLE potted plants, one plant and ONE pot per cell, never pairs or grouped pots. Every cell has the SAME square dimensions, with generous transparent gutters; each entire plant-and-pot occupies a similar visual height (about 70% of its cell) and stands centered on the same relative baseline. Reading order: top-left a lush fern in a warm terracotta tapered pot with a rolled rim; top-middle a snake plant in an ivory tall cylindrical ceramic pot with a subtle carved stripe; top-right a broad-leaf monstera in a natural tan woven basket planter; bottom-left a rounded succulent rosette in a low sage-green faceted hexagonal ceramic bowl; bottom-middle a branching cactus with one tiny coral flower in a mustard-yellow glazed pot on short feet; bottom-right a delicate flowering orchid with pale pink flowers and dark green leaves in a dusty-rose rounded ceramic pot. Keep all six plants equally prominent and equally sized in height despite different silhouettes. Refined original nostalgic 16-bit/32-bit garden-game pixel art, crisp visibly stepped pixel clusters, restrained olive/sage/forest greens, earthy varied pottery, subtle warm highlights, slight three-quarter game-sprite perspective, appealing detailed pots, readable at about 100 CSS pixels. GENUINELY TRANSPARENT alpha everywhere outside the six sprites and between leaves, no backdrop, no ground rectangle, no cast shadows, no green glow or haze. Transparent space around every individual sprite, no touching neighbors or cropped leaves. No grid lines, labels, letters, numbers, watermark, people, scenery, extra pots, duplicate designs, photorealism or blurry watercolor. This is an organized sprite atlas, not a scene.
