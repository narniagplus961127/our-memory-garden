# 107 — Automatic filters and garden details

Status: resolved

Make Garden year/category filters apply immediately and debounce text search without an Apply button. Preserve focus, Chinese composition, newer draft text during slow navigation, clear/back/pagination behavior and public/private boundaries. Photo Grid hover scales the complete pinned paper mount rather than the image; preserve entrance/reduced-motion behavior and viewer access. Restyle live count-up units as wooden planks without changing timer data/settings. Add restrained original pixel potted-plant decorations to the public main background, clear of content and controls.

## Answer

Garden selections now submit immediately and search waits 400 ms for a typing pause. Normal browsing has no Apply button. Native Form navigation preserves the shell and input focus; draft values survive older responses, Chinese composition and early hydration interactions. Clear/history cancels queued searches and restores URL state. A noscript submit remains available. Locale-stable category sorting avoids server/client ordering differences.

Photo Grid hover scales the complete mounted tile using independent CSS scale, preserving its entrance transform and leaving image transform unchanged. Reduced motion disables scaling. Live count-up tiles reuse the wooden plank asset while retaining timer updates, settings and configured colors. Three original transparent plant arrangements add six varieties to the public background as non-repeating, pointer-free decorations. The optimized 384-pixel exports total 110,166 bytes and receive immutable versioned caching; no existing photos are read or rewritten. Prompts and asset paths are recorded in docs/automatic-filters-pixel-details.md.

Validation: twelve desktop/mobile journeys pass across automatic filtering, delayed responses/newer text/focus, Chinese composition, early input, clear/back/pagination/privacy, tablet layouts/shared cards, artwork alpha/size/bounds/pointer behavior, paper hover/reduced motion, editor/public viewer access, and counter authoring/round-trip/continuing seconds. TypeScript, targeted formatting, diff checks and production webpack build pass. Reviewed the wooden counter and public-background screenshots.

Known limits: plant artwork is static and decorative, fainter on mobile, and can be covered by opaque authored sections. Search intentionally waits 400 ms between typing and navigation. Hosted authenticated editor behavior is verified separately from anonymous release smoke checks. No schema migration or new service is required.
