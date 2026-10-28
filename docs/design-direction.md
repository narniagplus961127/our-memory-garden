# Sunlit Garden design direction

The latest design exploration uses a full-width page canvas and section backgrounds, warmer parchment surfaces, forest typography, restrained clay accents, and photographs without enclosing rounded cards. The homepage is a simple editable page built from the same blocks as other pages; its sample image may extend edge to edge. The admin workspace uses a distinct sage tint and dedicated navigation.

## Layout and spacing

The website uses a fluid page canvas without a fixed maximum content width. Content blocks can adapt to the available space, and images or backgrounds may extend edge to edge. Preserve comfortable text readability through responsive block layout and spacing. In the desktop admin designs, the sidebar brand and navigation labels share a 64 px left inset; adjust responsively for smaller screens.

## Style guide and assets

The FigCraft document has a separate **General styles & brand** page. It contains the palette, H1–H4 / paragraph / small typography, layout-width diagrams, components, and brand examples. The document includes named paint/text styles and reusable button components.

Brand assets are under `assets/brand`. The generated garden photograph is sample design imagery, not a personal photograph from the owners.

## Review state

The owner approved the FigCraft design and core editor flow on 2026-10-28, based on commit `e11a9c0`, completing ticket 01. The prototype represents interactions using linked screens. Follow this approved visual direction during implementation and the remaining design follow-through recorded in `docs/design-spec-review.md`.




Desktop public mockups use 64 px left and right outer gutters. The desktop admin sidebar is 240 px wide with 64 px padding on both sides; the admin content begins 64 px after the sidebar. Mobile mockups use 28 px gutters. Responsive implementation should maintain equal left and right gutters and sidebar padding, with edge-to-edge image blocks as the explicit exception.


Admin desktop screens use a dedicated sidebar with the brand, navigation, View website, account and sign out; there is no public website header. Mobile admin screens use a compact brand bar and an admin navigation menu. The public site retains its header. Editor visibility and saving states belong within the workspace.

