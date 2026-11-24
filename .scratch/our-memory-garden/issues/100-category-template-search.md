# 100 — Search Categories, Templates and template-content choices

Status: resolved

Add case-insensitive search for category names/paths, template names and the Use template content popup. Preserve manual sequence; disable dragging while filtered so a partial list cannot overwrite order. Category results retain ancestor context. Show useful no-result/clear-search states and keep an already chosen import template available when searching. No page content/settings changes until the existing import confirmation.

## Answer

Categories and Templates now filter their existing lightweight list data locally. Category results include ancestor context and full-path matches; clearing search restores the same sequence. Filtered drag handles are disabled, with a clear-search hint, while ordinary row actions still target stable IDs. The template-content picker filters names, retains an already selected template and requires the existing review/replacement confirmation.

Desktop/mobile browser journeys pass for case-insensitive matches, hierarchy, no-result/clear states, blocked reorder requests, unchanged order after clearing, pinned selected template and cancel without changing content. TypeScript and targeted formatting pass. The feature adds no requests or schema changes; its browser journey is in admin-search.spec.ts. Search is local to the open view and does not add server pagination or persistent query preferences.
