# 75 — Paginate the Media Library

Status: resolved

- Load the Media Library and single-photo picker in batches, newest first. Search the full library by photo name or associated page title.
- Return only fields used by each library card. Fetch the full photo and its page usages when Details opens.
- Preserve upload, photo selection, unfinished deletion, and access checks. The Photo Grid picker retains its existing batch selection.

## Verification

The library view returns up to 24 summaries and a cursor. The service checks cover page-title search, private caching, equal timestamps, and new uploads or deletions between batches. Desktop and mobile checks cover loading the next batch in the Media Library and the single-photo picker. The existing API response remains available to older open editor tabs.
