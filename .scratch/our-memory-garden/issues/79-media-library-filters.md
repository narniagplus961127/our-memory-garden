# 79 — Organize the media library

Status: resolved

Add upload-date, page/event and usage filters to the shared photo library and pickers. Provide optional upload-month grouping in the library. Search page/event suggestions in bounded batches; preserve photo selection across filters and reset pagination when a filter changes. Unused means no current page/cover reference, including private and trashed pages, matching deletion rules. History alone does not make a photo used.

## Verification

The shared library and single/multiple photo pickers have collapsible usage, upload-date (UTC) and page/event filters. Page/event suggestions search up to 25 matching pages with current photos. Optional upload-month headings group loaded library cards. Filter changes reset batching and range anchors while preserving the parent's selected photo IDs. Dates include the selected final day; invalid ranges return a clear error.

The existing seven media API boundary checks and the new filter check passed, including private/current references, page suggestions, leap-day boundaries, grid picker parity and invalid filters. Desktop/mobile checks passed for real uploads, event and unused filtering, month headings, horizontal overflow, existing library batching and single-photo selection. Local fixture database and artifacts must stay outside watched source folders to avoid preview reloads.
