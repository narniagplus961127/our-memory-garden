# 106 — Wooden page cards and inline Garden filters

Status: resolved

Put the Garden search, year, category and apply/clear actions on one aligned row for desktop/tablet, with a stacked mobile form. Use the shared PageCards renderer for Page Grid widgets, category pages and Garden: each card is a wooden board with a pinned paper mount, cover photo or placeholder, page title/date and optional short description from the existing sharing description. Keep stable links, filtering/pagination, public/private boundaries, responsive image sources and keyboard access. Do not fetch editor content or image originals to make descriptions.

Owner refinement: remove the visible Find a memory, Year and Category labels while preserving their accessible names for assistive technology.

## Answer

Garden controls and apply/clear actions now share one bottom-aligned row at 768 px and wider, with stacked mobile fields. Labels are visually hidden but remain accessible. Shared PageCards now renders wood frames with pinned, torn-paper mounts, cover images/placeholders, titles, optional dates and up to three lines of description across Garden, category pages and Page Grid widgets. Descriptions reuse the existing Sharing description; page settings explains this use. No database migration or original-photo reads are introduced.

Card queries select at most 240 description characters and retain existing visibility/trash predicates, category matching and limits. Verification also exposed an existing manual-grid cold-start UUID-array mismatch. Its ordered selection now uses parameterized JSON with ordinality, preserving the selected order without depending on driver array-type discovery.

Validation: the final desktop/mobile card journeys pass, checking tablet/desktop widths 768/1024/1280, hidden accessible labels, row alignment, cover/placeholder, blank/long/literal-markup descriptions, stable links, keyboard focus and all three listing locations. Two existing Garden journeys pass for search/filter/reset/pagination/privacy. The existing service check passes for manual order, limits, category matching and nested/public/private rendering. TypeScript, targeted formatting, diff checks and the production webpack build pass. Reviewed tablet filters and a full-color widget-card screenshot. See docs/wooden-page-cards.md.

Known limits: descriptions appear only when the page has a Sharing description; no automatic excerpt is derived from editor content. Long titles/descriptions are visually clamped while the page remains accessible through its stable link. Hosted authenticated editor behavior is not part of anonymous release smoke checks.
