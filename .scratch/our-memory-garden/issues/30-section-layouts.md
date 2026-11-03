# 30 — Section-first page layouts

Status: resolved

## Request

Start every new page layout with a Section. Blocks and Columns belong inside a Section. Each Section has its own background image, content background (Auto/Custom/None), section colour, border, four-side padding and column vertical alignment. Follow the owner's Klaviyo reference and retain the garden colours and compact inspector.

## Acceptance

- Blank pages begin empty with an obvious Add Section action. All templates contain Sections at page level.
- Add, drag and Move controls keep new blocks/Columns inside Sections; Sections are page-level containers. Touch alternatives remain available.
- Section settings save and render consistently on desktop/mobile, including safe colours, media access rules, borders, padding and column alignment.
- Preserve existing pages, IDs, legacy root blocks, history, recovery and inline text focus. No content rewrite simply on opening an existing page.
- Verify new layouts, native dragging, settings persistence/public rendering and media safeguards. Update spec/design reference and commit/push.

## Compatibility

The stored data validator continues accepting historic root blocks for existing pages, history and backups. Editor insertion and placement rules apply to newly arranged content; existing root blocks can still be edited or moved into a Section.

## Verification

- Section browser checks pass on desktop/mobile: empty start, disabled block creation before a Section, Columns and nested typing, independent side padding, colours, border, alignment, save/reload, public rendering and moving between Sections. Desktop native dragging accepts children and rejects root blocks/nested Sections; mobile uses verified Add/Move controls.
- Four block/media service cases and fourteen concurrency/history cases pass. Background photos follow public/private transitions, originals stay protected, referenced deletion is blocked and unsafe styles/nonexistent photos are rejected.
- Editor regressions cover inline formatting, composition, conflicts, nested moves, template independence, responsive canvas sizes, title visibility, photo/button settings, autosave failure/toast/retry, account privacy and device recovery. Updated old fixtures explicitly preserve historic root Text content; blank pages no longer silently provide it. History navigation waits for editor initialization; creation fixtures use unique URLs.
- TypeScript, Prettier, whitespace checks and the optimized build pass. Local-authenticated browser flows use development mode; the production-mode local-auth guard is intentionally retained.
- Visual evidence: [desktop](../../../docs/evidence/ticket30/section-settings-desktop.png), [mobile](../../../docs/evidence/ticket30/section-settings-mobile.png). Native FigCraft frames have not been redrawn for this incremental owner request; the application and updated editor/state references describe the current implementation.

## Answer

New layouts follow Page → Section → blocks/Columns. Section Styles provides the requested independent appearance controls. First-character and subsequent typing retain focus through autosave on desktop/mobile; existing page data remains intact. Tickets 27–30 are delivered together through the production branch after their individual working-branch pushes.
