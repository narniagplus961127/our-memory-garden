# Design and specification review

The FigCraft document is the design reference for implementation, subject to owner approval. Ticket 01 remains open and blocks development until the relevant design is reviewed. The FigCraft prototype illustrates states; it is not a working website.

## Aligned so far

- Desktop and mobile frames exist for home, a public page, gallery, login, dashboard, templates, and private/public editor states.
- The homepage is a regular public page using example content blocks; the image can span the viewport. No separate story feature is implied.
- The style guide includes H1–H4, paragraph, small text, palette, buttons, fields, privacy indicators and reading/wide/full-width guidance. Brand assets include a logo and favicon.
- Public pages use warm parchment. Admin screens have a sage-tinted workspace and dedicated navigation.
- The prototype contains links between example states, including visibility changes. Destinations were checked for existence, but the complete interaction flow has not been tested in the FigCraft player.

## Design gaps before ticket 01 can be approved

- The editor shows a simulated added block and saved state, but does not yet demonstrate a complete block-editing flow, reordering controls, different block types, device-view switching, or saving/failure/retry and concurrent-edit warnings.
- Desktop and mobile overview, pages, media library, navigation and settings screens now exist. Detailed flows for page settings and addresses, categories, grids, menu editing, media upload and usage, search visibility, history, trash and export still need design and review. Corresponding tickets 04–12 retain those requirements.
- The gallery and sign-in examples are illustrative; check actual player navigation, gallery stepping, password recovery and mobile interactions. A mobile admin menu is now illustrated; the public mobile navigation still needs a complete design.
- Private-page not-found, private media, photo deletion warnings and restore-as-private behavior are specified but not visually demonstrated. Privacy must be enforced by the application and storage, not inferred from visibility in the design.
- The homepage and ordinary page should be visually reconciled as components evolve; the sample home shows a full-width image, while the existing page example has an inset placeholder.
- The photo and example copy are placeholders. The garden illustration and animal details remain sparse. The logo wordmark is a hybrid SVG containing a raster mark; favicon is a simplified vector.

## Development handoff

Follow approved FigCraft screens and style guide for visual presentation. The specification and individual tickets govern behavior, security, data handling and tests. Resolve missing or conflicting design states before implementing the affected interaction. Keep the public and admin themes distinct, and keep the homepage editable with the same blocks as other pages. Never interpret simulated prototype controls as completed product behavior.

The owners subsequently removed the fixed page content-width limit. Use a fluid layout and the larger shared header/sidebar inset shown in the prototype; earlier numeric reading and wide limits are superseded.




Individual Homepage, Account, Storage and Export settings screens now exist on desktop and mobile. They align with existing homepage, account recovery, storage monitoring and export requirements. The screens use example data and entry-point controls; completion states, errors, exact storage data source, and functional security remain to be specified and validated during development. Owner approval of the overall prototype remains pending.


Desktop and mobile Photo details screens now illustrate a public photo's usage, restricted original download, and in-use deletion safeguard. Private-only, unused-photo, upload, and deletion confirmation/error states remain to be designed and verified.


The page editor was redesigned with a Klaviyo-inspired palette, canvas and contextual block settings on desktop, plus a compact mobile canvas and content panel. The spec and ticket 04 now include button blocks, sections, columns, desktop/mobile canvas views. The static prototype demonstrates selection between illustrative states; dragging, responsive panel behavior, block settings beyond text, preview, errors and save/conflict flows still need design and interactive validation.


The separate Preview button was removed by request. The editor canvas remains live, and the desktop/mobile view controls remain. Save/error indicators still need full design and validation.



Puck is selected as the React editor foundation. The existing palette/canvas/settings design has selected-block outlines; it remains a custom garden-themed design rather than an assertion that Puck's default UI matches it. Validate the editor experience with the local Puck experiment before design approval; verify production autosave, authentication and multi-user conflicts during implementation. Puck overrides/plugins may be experimental.


## Editor-first review decisions

- The owners agreed to a small local Puck feasibility experiment during the design phase, before approving ticket 01. It should validate desktop and mobile editing, adding and moving blocks, sections/columns, device views, and the auto-save interaction, then inform the FigCraft design.
- Review the working experiment and corrected design together before approving the design or starting full implementation.
- The first working slice should cover a private page, text, a basic image placeholder, sections/columns, and auto-save; the media library, galleries, page grids and remaining settings follow.
- If both administrators edit the same text block and one saves first, preserve the second editor's local text and show both versions for a choice; do not silently overwrite either version.
- Ticket 00 now covers the design-phase experiment and blocks ticket 01. Tickets 02–04 establish private pages, visibility and the first Puck editor slice; ticket 09 adds robust recovery and conflicts, and ticket 10 adds history UI.

- The Puck experiment uses sample content and local storage. Supabase persistence, security and real network-failure behavior are verified during implementation.
- On a same-block conflict, preserve the second editor's local text and offer keeping it, accepting the saved version, or copying it for manual editing. Preserve the saved version in page history before replacing it.
- After an unsaved edit and a browser refresh or closure, attempt recovery on the same device and clearly mark the recovered changes as unsaved until persistence succeeds.

- Conflicting moves or deletion of the same block require a choice from the second editor while preserving unsaved work; independent changes should be applied where safe.
- Device-local recovery copies are cleared after successful saving or administrator sign-out.
- The Puck experiment succeeds only after desktop and mobile testing of adding and editing text, adding an image placeholder, sections and columns, moving blocks, switching canvas size, and simulated saving/recovery. Report and resolve any gap before full development.


## Local Puck experiment — initial findings

Puck 0.21.3 runs locally with sample text, image placeholders, sections and columns. Top-level tap-to-add and move controls, text edits, canvas-width selection, and simulated local save/failure/reload recovery were exercised. Nested non-drag editing and real phone-size usability remain unresolved; the experiment uses local storage and does not establish production security, persistence, or multi-user behavior. The owners need to review the experiment and resolve these gaps before design approval.
