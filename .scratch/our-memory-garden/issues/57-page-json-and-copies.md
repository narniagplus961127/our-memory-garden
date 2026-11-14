# 57 — Export, import, and copy a page

Status: resolved

## Design review

The owner requested editable page JSON and copying from another page. Review [Page JSON and copies.figcraft](../../../docs/Page%20JSON%20and%20copies.figcraft). The owner approved the FigCraft design and clarified that each page has its own JSON import/export. Import replaces the open page after review. The Pages flow creates a private copy of an existing page. The approved FigCraft review modal and copy form guide these flows. The prototype uses sample content and does not save pages.

## Acceptance criteria

- From editor Page actions, Download page JSON saves the latest committed page as a versioned and indented UTF-8 JSON file. Wait for content, details, and address saves to finish, and explain when an action is unavailable. Include editable text, formatting, layout, block IDs, page details and sharing text, and the complete ordered list of each Photo grid with its captions and alternative text. Include source identity and revision information for a safe round trip. Keep protected photo bytes, account information, credentials, page history, and navigation out of the JSON. Provide a small editable example, including how plain text and formatted text are represented.
- To edit without the visual editor, download the saved JSON, edit it, and choose Import page JSON from the destination page's editor menu. Files can come from an export of that page or another page, or use the versioned format directly. Review the content and details before confirming. Preserve the page ID, URL, visibility, homepage assignment, and indexing control. Preserve the prior content and details in History so the update can be undone. For a public page, the confirmation says that the changes will appear on the website immediately. Reject a stale same-page export. For any file, also guard against changes to the destination between review and the write. Allow cancellation without changes.
- From Pages, Copy from page allows selecting any active page available to the administrator. Start with the source title plus “(copy)” and a title-derived editable URL. The new page is private, with copied content and page details. It reuses Media Library photos and keeps its own Photo grid collections. Opening either editor and changing its content, grid order, captions or alt text leaves the other page intact. Copying the homepage produces a regular page.
- Keep the existing template flow and garden backup available. Use shared controls, keyboard focus, pending/disabled states, and reviewable validation on desktop and mobile. Protect every read and write with administrator authorization. Validate well-formed JSON, file version, block settings, rich text, and references server-side. Create/update the page, details, and grids atomically. A failed or retried request must leave a consistent result.

## Verification

Desktop and mobile verified invalid JSON, cancellation, reviewed replacement, download and private copy, including duplicate URLs. The API verified same-page and cross-page imports, stale revisions, private access, unavailable photos, History restore, and independent 103-photo grids. The existing inbound-link recovery assertion expects an old label and fails separately; the other 17 related API checks passed.

## Comments

2026-11-14: Owner approved the FigCraft design, then clarified that importing is a per-page replacement.
