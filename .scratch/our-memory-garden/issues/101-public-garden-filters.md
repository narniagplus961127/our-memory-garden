# 101 — Search and filter the public Garden by year and category

Status: resolved

Add title/slug search and page-date year/category filters to /garden. Preserve filters through pagination and browser navigation, reset to page one on apply/clear, include descendants in category matches and exclude the homepage in every Garden view. Only public, non-trashed pages may appear, even for signed-in administrators. Filter choices must not reveal private-only years/categories. Keep queries bounded to card metadata, reuse existing indexes and avoid requests on each keystroke.

## Answer

Implemented explicit-submit GET filters with Next Form, metadata-only public year/category facets, recursive category matching and filter-preserving 24-card pagination. Private/trash-only choices and the homepage remain excluded even for administrators. Browser back/forward and clear/apply behavior are verified at desktop/mobile sizes. Ten combined browser journeys, two final full-screen menu checks, nine media service checks, TypeScript, formatting, diff checks and the production webpack build pass. See docs/garden-browsing-photo-labels.md.

Known limits: searches match title/slug substrings, not editor text; undated pages appear only under All years. Facets reflect public pages independently of current filter combinations.
