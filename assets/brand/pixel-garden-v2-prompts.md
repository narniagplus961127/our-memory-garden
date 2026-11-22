# Detailed pixel garden artwork

Created with the built-in image generator on 2026-11-22. These original illustrations replace the simple SVG map on the dashboard, footer and menu. The owner's screenshots were visual references; the maps and compositions are new. No user photograph was modified.

## Panorama

Final website assets: `public/brand/garden-panorama-v2.webp` (1920 × 640) and `public/brand/garden-panorama-small-v2.webp` (960 × 320). Standard WebP export at quality 85 preserves the generated scene; browsers choose an appropriate size for the dashboard, and mobile footers use the smaller asset. The footer uses one continuous cover image with `no-repeat`.

Prompt:

> Create an original richly detailed 16-bit / 32-bit pixel-art garden village PANORAMA for a cosy couple's memory-garden website, inspired by classic top-down countryside RPG environments. Very wide landscape composition, about 3:1 aspect ratio. High-quality true pixel art: tiny crisp square pixels, intricate tiled textures, lush layered pine trees and shrubs, soft sage greens, mossy stone embankments, a gently winding turquoise stream, two charming cream cottages with orange terracotta roofs, a wooden footbridge, winding pale sandy paths, little pink and white flower beds, a small vegetable patch and a wooden bench. Peaceful warm daylight, inviting and romantic without obvious hearts. Original scene and layout, no identifiable game characters, no existing game map reproduction. Compose as one continuous landscaped scene, not a repeated tile, no artificial panel boundaries. Put the primary garden, stream, footbridge and flower details along the horizontal middle band so a shallow wide footer crop is still attractive, with rich forest and cottages above. Enough visual detail to look like a finished game environment rather than large flat SVG blocks. Entire canvas filled by artwork, no blank margin, no text, no lettering, no UI, no watermark.

## Menu

Final website asset: `public/brand/garden-menu-v2.webp` (720 × 1080), WebP quality 85. This is a different illustration, shown once in a dedicated decorative region beneath the independently scrolling navigation. No repeated or tiled background is used.

Prompt:

> Create an original, finished, richly detailed 16-bit / 32-bit pixel-art garden village illustration for the tall decorative panel of a cosy memory-garden website's slide-in menu. Portrait composition, 2:3 aspect ratio. Classic top-down countryside RPG perspective, crisp small square pixel clusters and intricate tile textures, not large flat vector blocks. Layered dark pine forest along the top, two small cream cottages with warm orange terracotta roofs at upper left and upper right, lush sage-green grass and tiny white/pink flowers, stone retaining walls, a winding turquoise river descending toward the bottom, a charming wooden footbridge across the river near the lower middle, little sandy paths, a bench and a vegetable garden. Peaceful warm morning light, visually coherent green and warm cream palette, rich but gentle colour. Garden details across the whole image, original map layout, no repeated tiles or borders, no recognisable copyrighted game characters or locations. No text, no labels, no interface, no watermark, no blank margin.

## Delivery and caching

Only the selected optimised WebP exports are shipped. Versioned filenames have one-year immutable browser/CDN caching; replace them with new filenames for future artwork updates. Assets are static files and do not pass through Neon or media APIs. The smaller panorama is about 180 KB, the larger one 588 KB, and the menu illustration 364 KB. The previous SVG and generator remain historical sources; active theme surfaces use these replacements.
