# 85 — Refine pixel artwork, viewer colours and content blocks

Status: resolved

The owner requested consistent photo-popup colours, matching sidebar surfaces and action typography, richer original game-garden artwork, a continuous non-repeating footer image and a different non-repeating menu illustration. Include Photo Grid, Swiper and other content blocks in the pixel appearance, plus restrained hover/focus feedback for photos, listing cards, menus and buttons. Preserve authored content/settings, photo quality, zoom/swipe, ordering, pagination, touch controls and reduced motion.

Use generated original imagery optimised as locally hosted versioned WebP assets with long-lived caching. Give the menu a separate decorative image region so links scroll independently without being hidden by the image. Keep existing custom corner and colour settings functional; new/default Photo Grid corners should be crisp. No production content mutation or schema changes.

## Verification

Six targeted desktop/mobile journeys passed for Photo Grid creation/selection/reordering, fullscreen viewing, zoom/pinch/swipe, standalone/Swiper photo navigation, Swiper responsive pagination and live counters/isolated embeds. Added a title/background contrast regression assertion to the real Photo Grid viewer journey. The older Swiper test expected the previous Sunlit Garden RGB values; its palette assertions were updated to the active pixel theme and both device checks passed.

Reviewed the detailed dashboard, continuous footer, separate portrait menu and light photo popup. The footer and menu both report `no-repeat`; the menu navigation ends exactly where its decorative image starts and retains `overflow-y: auto`. The desktop sidebar and bottom actions have the same leaf background and all three actions use 16 px text. Viewer title/controls use forest text on cream, with sage letterboxing. Photo hover scales only the image to 1.025 on fine-pointer devices; reduced motion reports no transform and zero transition. Keyboard focus remains visible. Authored corner/colour settings are preserved; new/default Photo Grid corners are 2 px. Typecheck, formatting and diff checks passed.

Artwork was created using the built-in image generator. Selected optimised assets and full prompts are in [the artwork record](../../../assets/brand/pixel-garden-v2-prompts.md). Static versioned files use one-year immutable caching; APIs and private media cache policies are unchanged. All checks used local fixtures without changing production pages or photos. The production build passed; delivery follows the linked branch and pull request.

## Limits

The higher-detail WebP assets are larger than the old flat SVG: 180 KB small panorama, 588 KB large panorama and 364 KB portrait. Responsive selection and immutable static caching limit repeat transfers. Existing explicit corner/colour choices can intentionally differ from the new defaults. The separate Next.js security follow-up remains ticket 81.
