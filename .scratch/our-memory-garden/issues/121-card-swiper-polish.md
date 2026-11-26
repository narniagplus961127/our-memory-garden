# 121 — Lift cards and refine the swiper as a photo album

Status: resolved

Apply the approved lift-and-shadow hover to public page, garden and category listing cards, preserving their colours and images. Give swiper slides cream paper frames with a small tape detail, a glimpse of the next slide, plain side arrows and compact dots. Preserve configured slides per view, nested blocks, photo viewer, touch swiping and editor behavior. Honour reduced motion. Verify desktop/mobile and publish under standing authorization.

## Answer

- Listing cards and existing template cards gently lift 3px over 180ms; wooden card borders, backgrounds and images keep their colours. The shadow deepens without changing layout size.
- Swiper slides use cream paper frames and decorative tape, including their editor previews. Paper supplies readable default text on dark sections; authored inline block styling still takes precedence.
- Public swipers show the configured number of complete slides plus 20–40px of the next slide. Plain side arrows retain their accessible hit areas and focus outlines. Dots are round and directly below the slides. Removed image-block margins inside swipers so pagination does not inherit excess spacing.
- Recompute navigation offsets when showing controls changes slide width. Single slides use the full viewport and do not reserve peek space. Nested swipers only apply their own overflow setting.
- Lift animations are enabled only for motion-enabled fine-pointer devices. Reduced motion retains static shadows; touch devices keep native scrolling and snapping.

## Verification

- Existing swiper browser flow passed on desktop and mobile, including creation, editor changes, import round trip, configured slide counts, dark-section contrast, dots/arrows and actual touch swipes. Updated the existing width/colour expectations for the approved design.
- Local CLI checks with synthetic photos: image viewer advances between slides; keyboard ArrowRight changes page; hover preserves card colours, borders and width while adding the 3px lift; reduced-motion lift is absent.
- Visually reviewed 1280px and 390px layouts. Measured dots 10px below image slides. Single-slide check: full 334px viewport width and zero horizontal overflow.
- Formatting and production build/type checking pass. No production page content, photos or settings changed.

## Limitations

Existing per-block custom colours or spacing take precedence over the default paper framing. The temporary visual fixtures use synthetic photos rather than reading private production images.
