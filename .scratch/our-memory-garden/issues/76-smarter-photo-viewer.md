# 76 — Smaller viewer previews and conditional private thumbnails

Status: resolved

- The photo viewer chooses a thumbnail based on the fitted image width and device pixel density. Zoom requests the full display copy, retained until moving to another photo.
- Private thumbnails return validators and require revalidation. Check current administrator access before returning an image or an empty 304. Protected originals retain no-store.
- Give Show more and Load more controls a shared, centered row with spacing above and below in the library, photo pickers, Photo Grid settings, and published grids.
- Default the Pages list to newest page date first, with undated pages last. Manual ordering stays available in the sort menu.
- Verify desktop and mobile zoom, swipe, next/previous, and private conditional requests after authentication is removed.

## Verification

Seven service checks passed, including private thumbnail 304 responses for administrators and denial without a session. Desktop and mobile browser checks passed for thumbnail previews, zooming to full display, navigation, shared pagination spacing, and the newest page-date default. Typecheck, formatting, and whitespace checks passed. The changes use the existing database schema.
