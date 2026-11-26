# 124 — Forest header, photo viewer chrome and shared icon buttons

Status: resolved

Use dark forest green with white text/icons for dashboard list buttons, the public header, photo-popup header/footer and controls, and swiper arrow buttons. Apply the same header treatment on mobile administration. Preserve wooden menu details, compact pagination, image appearance, focus indicators and disabled states. Verify and deploy under standing authorization.

## Answer

Used the shared forest (`#355641`) and white (`#ffffff`) roles for the public/mobile-admin header, photo-viewer header/caption footer, viewer close/previous/next/zoom buttons, swiper arrows and all shared list-row buttons (including grips and dropdown triggers). Public and mobile-header branding is white, including the logo. The mobile admin dropdown retains dark text on its light surface.

Hover buttons deepen the same green; disabled states retain their existing opacity and behavior. Light focus outlines remain visible against the new dark headers. The sage viewing stage, wooden menu tiles and square pagination keep their existing design.

## Verification

- Existing swiper end-to-end flow passed on desktop and mobile, including the updated header/brand colours, creation, saved settings, pagination and touch swiping.
- Local browser checks measured the exact forest background and white text for the header, swiper, viewer header/footer, next/zoom controls and multiple category-list grip/action buttons.
- Checked viewer zoom/reset, next image and closing, mobile header and administration menu contrast; visually reviewed desktop and 390px mobile screenshots with synthetic photos fully loaded.
- Formatting and production build/TypeScript checks pass. No content, media or settings data changed.

## Limitations

Compact pagination remains dot-only; user-authored content colours and non-targeted form/dialog surfaces retain their existing styling.
