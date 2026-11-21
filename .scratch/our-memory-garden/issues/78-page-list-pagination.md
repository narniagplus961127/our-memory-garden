# 78 — Paginate page listings

Status: resolved

Use bounded database queries for Pages, Garden and category listings. Preserve server-side search and sorting, page dates, private-page boundaries and manual order. Reordering a visible batch must preserve pages outside that batch. Use consistent Previous/Next controls and retain filters in links.

## Verification

Pages, Garden and category listings fetch at most 25 summaries for 24 visible cards, with deterministic ordering and bounded page parameters. Search and sort run in the database and remain in pagination links. Manual dragging replaces visible slots while retaining hidden IDs. Dashboard summaries remain unchanged.

Desktop and mobile checks passed for existing search/sort behavior, 26-page batches, filter retention and anonymous private-page exclusion. A pure ordering check covers hidden IDs and newly ordered pages. Typecheck passed. Offset pagination can shift when another administrator adds or removes pages while browsing; reordering remains version checked. Cross-batch dragging is not provided.

Final review moved partial-order merging to the server transaction. It materializes the complete effective ID order only when dragging, including pages that have never been manually ranked, then replaces the visible slots. A service regression verifies a later batch cannot jump ahead of unranked earlier pages and stale versions are rejected. Category pagination is also covered on desktop and mobile. Search state preserves typing while an earlier server search returns.
