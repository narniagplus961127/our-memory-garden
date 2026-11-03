# 14: Edit directly on the page with a clearer visual workspace

## Status

claimed

## What to build

Improve the Puck editor using the owner-supplied Klaviyo screenshots and live editor as interaction references. Writing should happen in the selected widget on the canvas; the sidebar should concentrate on appearance and layout. Preserve the garden identity, existing pages, server authorization and dependable automatic saving.

## Design gate

Prepare and review the updated FigCraft desktop/mobile states and disposable interaction prototype before production implementation, following the owner's design-first instruction. The existing released editor remains the accepted baseline until this proposal is approved. This ticket is not complete when the prototype is complete.

## Acceptance criteria

- [ ] Click text on the canvas to select it and enter inline editing without opening Settings. Support Text, banner heading/description, button labels and image captions. An image/placeholder offers an adjacent Choose/Replace action.
- [ ] Show a contextual text toolbar for H1–H4, paragraph and small; bold, italic, underline, alignment and safe links. Keep the shared typography and palette. Keep appearance controls separate from writing.
- [ ] Provide a compact top bar, a narrow Content / Styles / Outline rail, a two-column block palette and a large fluid live canvas. Selection automatically reveals the relevant block styles, with a clear Back to content action.
- [ ] Show selected-block actions beside the block: move up/down, duplicate and remove. Preserve drag handles, keyboard operation and touch-friendly alternatives. Typing/selecting text must not drag its block.
- [ ] Drag a new palette block to an exact insertion position, or drag an existing block between positions, including inside sections and individual columns. Show clear insertion lines, highlight the destination container and scroll the canvas near its edges. Prevent a container from being dropped into itself or a descendant; rejected/cancelled drops keep its content. Keep reliable Add and move-button alternatives for touch and keyboard use.
- [ ] Offer a visual column chooser for one to four columns, equal layouts and useful two-column proportions. Show the affected layout before confirmation. Reducing columns preserves all child content in reading order, with a clear explanation before the change.
- [ ] Support block padding, garden colour presets plus a custom background picker and editable hex value, and image sizing/fit in labelled style controls. Any valid RGB colour is allowed; incomplete/invalid typed values remain visible for correction without being applied or persisted. Give mobile a compact inline toolbar and a dismissible style sheet that retains selection and focus.
- [ ] Keep palette cards compact (approximately 64 px desktop / 56 px mobile), with clear block names and drag grips. Shared select controls use consistent padding, an inset chevron away from the right edge, and visible hover/focus/disabled states; retain native keyboard and option selection semantics.
- [ ] Keep editable page title and always-visible Back to Pages, Page settings, Dashboard and History entries. Page settings exposes URL, visibility, optional date, categories, cover photo, sharing description and indexing separately from block Styles. Valid changes autosave; existing slug validation, homepage visibility restrictions, stable internal references and unsaved/recovery/conflict behavior still apply when navigating away.
- [ ] Preserve existing plain text, linked text, two-column layouts, nested blocks, page IDs, private media and retained versions. Existing plain strings containing markup stay literal text. Validate new formatting and style data at the server boundary; pasted HTML cannot introduce scripts, unsafe URLs or arbitrary CSS.
- [ ] Keep serialized autosave, failure/retry, device recovery, conflict choices, version history and the public/private boundary working through inline edits. Maintain caret/selection and IME composition during typing and save acknowledgements.
- [ ] Do not introduce Preview, Save, Publish or Undo/Redo controls. A prototype's simulated state must not be presented as real persistence.
- [ ] Verify real desktop/mobile browser editing, selection, keyboard and non-drag movement, nested layouts, reload persistence, failure/recovery and public rendering; add targeted service checks for new data validation and legacy compatibility.

## Reference and research

- Owner reference: https://www.klaviyo.com/email-template-editor/Sa5Cu7, inspected in the owner's Chrome session on 2026-11-02. Text editing exposes an editable canvas field and formatting toolbar; the sidebar retains padding/background/border controls. Image selection reveals replacement, dimensions and fit controls. The content palette separates Blocks and Layout. The supplied column modal shows count/proportion choices.
- The released baseline used Puck 0.23.0; this implementation pins 0.24.0 for native dedicated drag handles and inline rich-text fields. [Official inline-editing guide](https://puckeditor.com/docs/integrating-puck/rich-text-editing), [0.24 upgrade guide](https://puckeditor.com/blog/upgrading-to-puck-024).
- Native proposal and prototype routes are recorded in `docs/editor-inline-design.md` after generation. Prototype source stays on `prototype/editor-inline-experience`; it uses in-memory sample content and no garden account or backend.

## Comments

2026-11-03: Resumed implementation after usage interruption. Native inline writing/formatting, canvas photo selection, nested dragging, touch/keyboard movement, column chooser, custom colours, compact palette, shared selects, metadata and return navigation are implemented. The full desktop/mobile browser suite is running. TypeScript and formatting checks pass. All 64 API cases have been exercised: the complete run passed 62, then all 12 export cases passed in isolation after overlapping diagnostic exports were stopped and missing local fixture files were restored. The two failures in the complete run were fixture interference rather than editor failures. No production data was used or changed.

2026-11-03: Separate Standards and Spec reviews are recorded in `docs/editor-inline-review.md`. All four Spec findings were fixed and re-reviewed; no material concern remains. Browser regressions reproduce and verify saved column-layout preservation, equivalent legacy/rich conflict convergence, formatting comparisons, linked small typography, cross-tab logout and mobile panel access during recovery. The prototype remains on its separate branch.

2026-11-03: An additional real typing regression exposed premature #RGB expansion: typing `#a7c4a0` stopped at `#aa77cc`. The field now preserves the user's editable short form while applying its normalized value. Desktop and mobile sequential-keyboard checks pass for six-digit entry, short hex, invalid input and reload persistence. Production build, type checks and formatting checks pass.

2026-11-02: The owner approved the concrete FigCraft/interaction proposal at `57406c8` and explicitly requested implementation. The design gate is satisfied. Implement on `codex/ticket-14-inline-editor`, preserving the disposable HTML on `prototype/editor-inline-experience`. Existing browser journeys and authenticated API boundaries are the previously agreed test seams.

2026-11-02: claimed for reference inspection, specification alignment and the design proposal. Production implementation awaits owner review of the concrete proposed interaction.

The owner additionally requested dragging blocks into the desired position. The disposable prototype and native drag state cover palette insertion and existing-block movement, including nested column destinations; the production integration must use Puck's existing drag-and-drop state rather than ship the prototype's HTML drag implementation.

The owner subsequently requested any custom background colour, improved shared select spacing, shorter palette cards, and clearer page metadata/return navigation. These are included in the proposal and spec stories 63–65. The production application has not been changed by this prototype branch.

Prototype verification: real Chrome pointer drags inserted a new Text into the chosen right column (5→6 blocks), moved existing text between columns without duplication (5 blocks retained), and rejected dropping a Columns container into its own cell. Typed #f3a applied #ff33aa; invalid #oops retained the prior colour and displayed correction feedback. Page title/URL/visibility changed in memory and Back to Pages reopened the sample page without losing edits. At 390 px, the document had no horizontal overflow and top navigation controls retained 44 px heights. Earlier checks covered direct writing/formatting, image selection, reducing columns without lost blocks and returning focus after a mobile style sheet.

Known prototype limits: metadata validation and navigation destinations are illustrative; page cover/history entry points do not perform real operations. Pointer drag scaffolding, execCommand formatting and sample photo shapes are disposable. Native FigCraft states show snapshots and navigation, while the HTML demonstrates typing, colour input and drag transitions. Production autosave, Puck iframe behavior, browser colour picker behavior on target devices, safe rich-text representation, all-block appearance parity, recovery and server validation remain implementation work.
