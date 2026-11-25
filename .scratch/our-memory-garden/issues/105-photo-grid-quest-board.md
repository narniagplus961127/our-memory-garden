# 105 — Pinned photo quest board

Status: resolved

Give Photo Grid blocks a wooden quest-board frame and slightly torn paper mounts with decorative pins, in the editor and on the website. Preserve photo proportions, configured columns/gaps, pagination, ordering, responsive masonry, animation and the zoom/swipe viewer. Include mount dimensions in masonry measurement so cards do not overlap. Keep original photo bytes and saved page data unchanged.

## Answer

Added a CSS wooden board/frame, torn-paper backgrounds and small pixel pins to Photo Grid. Shared measurements include mount insets and natural image proportions; the existing responsive thumbnail sources and configurable image radius remain in use. No stored page content or original photo bytes change.

Existing desktop/mobile Photo Grid journeys pass with added board/paper checks and pairwise card non-overlap assertions. They also exercise editor selection/reordering, section container widths, publication, thumbnail selection and full-screen zoom/swipe navigation. Reviewed the board screenshot. TypeScript, formatting and production build pass.

Known limits: existing column/gap preferences are retained, including unused columns when a collection has fewer photos than its configured maximum; the paper/pins are decorative and cannot be dragged independently of the photo.
