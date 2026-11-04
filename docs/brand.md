# Our Memory Garden brand

The owner approved the twin-seedling direction on 2026-11-04 (ticket 33). Two seedlings of slightly different heights grow from one curved soil line: two people growing together. Four rounded, outlined leaves keep the mark simple.

Use forest green `#304337` with warm paper `#FFFCF5` or the existing sage administration surface. Pair the mark with the existing Georgia serif wordmark, “Our Memory Garden”. The website displays a 36 px square mark with a 12 px wordmark gap; mobile uses 32 px and 10 px. The shared Brand component covers public headers, the administration sidebar and mobile administration header. Its visible name labels the homepage link; the adjacent mark is decorative for screen readers.

## Assets

- Source: [`public/brand/seedlings.svg`](../public/brand/seedlings.svg), transparent and scalable.
- PNG export: [`public/brand/seedlings.png`](../public/brand/seedlings.png), 512 px with transparency.
- Browser SVG icon: [`src/app/icon.svg`](../src/app/icon.svg), on a rounded paper tile for contrast in light/dark browser chrome.
- ICO fallback: [`src/app/favicon.ico`](../src/app/favicon.ico), PNG entries at 16, 32 and 48 px.
- Phone icon: [`src/app/apple-icon.png`](../src/app/apple-icon.png), 180 px with an opaque paper background; the device applies its home-screen mask.

Run `npm run brand:build` after changing the source SVG. The generator derives every raster/app icon from that source, using the existing Sharp dependency. Next.js file-based metadata supplies the icon links. Do not stretch, rotate, recolour individual leaves or add shadows/gradients.

## Review reference

[Logo preview](evidence/ticket33/logo-preview.png), [native favicon sizes](evidence/ticket33/favicon-sizes.png), [320 px mobile header](evidence/ticket33/mobile-320.png).

This owner-requested mark supersedes the garden-gate logo in the original static FigCraft frames. The old gate PNG is retained for historical references; the application uses the new source SVG. Native FigCraft frames have not been redrawn for this increment.
