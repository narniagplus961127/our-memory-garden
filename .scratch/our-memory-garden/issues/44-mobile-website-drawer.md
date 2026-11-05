# 44 — Simplify the website menu

Status: resolved

Use plain chevrons beside submenu labels. On mobile, open the website menu as a full-height drawer with a slide animation, aligned header and list insets, and consistent nesting. Keep keyboard focus, touch targets and reduced-motion support.

The mobile drawer slides in from the right and fills the viewport height, with a maximum width of 360 px. Its header and scrollable menu share side padding. Top-level rows have subtle dividers and nested rows use a consistent indent. Chevrons have a transparent background and a 44 px touch target on mobile.

Six desktop and mobile browser checks passed. They cover drawer height and alignment, transparent chevrons, reduced motion, focus return, nested Escape handling and menu reordering. Formatting, TypeScript and the production build passed.
