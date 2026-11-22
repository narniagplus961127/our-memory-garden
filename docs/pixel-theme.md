# Pixel garden theme

Requested by the owner on 2026-11-22 for both the public website and administration. This replaces the Sunlit Garden visual direction; existing content, section arrangements, images and explicit authored text styles remain unchanged.

## Shared design

Use warm cream (`#fff8e7`) and sandy paper (`#fbf3dc`), leafy administration surfaces (`#edf2dc`, `#dbe8b6`), deep forest text (`#2e4630`), and restrained pink flowers. Forms and small actions keep at least 44 px touch targets where previously provided. Root text and standard controls use a 16 px base for the pixel glyphs; helper text remains smaller. Headings use the same pixel family, clear hierarchy and comfortable line spacing.

Shared shadcn controls, lists, cards, menus, dialogs, pickers and upload status use crisp corners and restrained offset shadows. Photographs keep their original rendering. Viewer controls, swipe/zoom, focus indicators, scroll containers, editor selection and reduced-motion behavior remain available. Do not apply `image-rendering: pixelated` to actual photos or force theme fonts over explicit inline author choices. Site default text inherits the theme.

The root layout self-hosts the unchanged Fusion Pixel 12 px proportional Chinese/Latin font through `next/font/local`, with swap and system fallback. Its 695 KB WOFF2 is a single cached static asset; no third-party font requests or animation library are added. Notices/source are in `src/app/fonts/README.md`. Puck's preview copies the root font variable and theme marker so its site default matches the public renderer.

## Artwork and branding

The two seedlings retain the original meaning: two people growing together from shared soil. The mark now uses whole-pixel stepped leaves, stems and soil. `public/brand/seedlings.svg` remains the source of truth for PNG, favicon and phone icons; regenerate them with `npm run brand:build`.

The owner removed all decorative landscapes on 2026-11-22 (ticket 86). The dashboard uses a compact full-width welcome panel, the footer keeps centred text, menus use the available scrolling space, and page-card placeholders use a plain leaf colour. Landscape images, their generator and cache configuration are no longer shipped. [Earlier artwork prompts](../assets/brand/pixel-garden-v2-prompts.md) remain an archival record only. The pixel seedling brand and user photographs remain.

Public menu and administration links share the same accent fill and inset pixel outline on hover/focus, while current-page styling stays distinct. Hover is limited to fine-pointer devices and transitions respect reduced motion.

Photo viewers use cream headers and controls, forest text and sage surrounding space; captions retain readable contrast. Sidebar sections use the same leaf colour, with all actions at the shared body size. Content blocks use pixel outlines, crisp default Photo Grid corners, square Swiper markers, pixel dividers and counter tiles; custom colours/corners continue to work. Hover feedback is limited to fine-pointer devices and has keyboard focus equivalents. Reduced motion removes lifts, photo scaling and transitions.
