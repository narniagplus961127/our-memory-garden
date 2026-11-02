# Inline editor refinement

Status: design proposal, awaiting owner review. Ticket: [14](../.scratch/our-memory-garden/issues/14-inline-editor-experience.md).

The owner requested a Klaviyo-like editor that allows writing directly in the widget. This refinement changes the main editing interaction; the existing released application and its completed tickets remain the baseline. The native FigCraft proposal and disposable HTML interaction prototype are review artifacts, not a claim of production implementation.

## Interaction model

Click a block to select it; click its text to place the caret and write. Selection reveals an outline, a compact block action bar and contextual styles. A formatting toolbar stays above the canvas while editing text. The sidebar contains appearance controls rather than a separate text-entry form. Escape leaves text editing, retaining the selected block. A Back to content control returns to the palette.

The Content palette groups the existing garden blocks separately from layout containers. The narrow rail switches Content, Styles and Outline. The main canvas uses the available width; desktop/mobile controls change only the editing viewport. An image placeholder or selected image exposes Choose/Replace on the canvas, while alt text, fit and size remain in labelled properties.

Drag palette blocks to insertion lines to create them at that position. Drag an existing block by its dedicated handle to move it between page, section and column slots. Highlight the destination and scroll near canvas edges. Reject self/descendant destinations without losing content. Text editing does not start a block drag. Add buttons and sibling move controls remain the reliable touch/keyboard alternatives. The HTML prototype demonstrates desktop dragging; production continues to use Puck's native drag state and must verify its actual iframe/nested behavior.

The column chooser offers one to four columns and visual proportion presets. Changing a two-column legacy arrangement retains its data. Reducing columns must explain that removed-column contents move into the final retained column in reading order; it must never discard them silently. The prototype demonstrates selection and layout choice, while the production migration/validation belongs to implementation.

Mobile keeps the canvas visible with a compact toolbar. Styles open in a dismissible sheet; formatting controls can scroll within their own toolbar without causing page-wide horizontal scrolling. All actions have 44 px touch targets and accessible names. Keyboard focus and selection return to the edited block when the sheet closes.

The top bar keeps an editable title, Back to Pages, Page settings, Dashboard and History visible. Page settings is distinct from selected-block Styles and exposes title, URL, visibility, optional date, category, cover photo, sharing description and indexing. On mobile it opens a taller scrolling sheet. Production navigation must retain existing autosave/leave/recovery behavior, rather than discard unsaved work. The prototype's Pages/Dashboard dialog only demonstrates destinations and preserves the in-memory sample; its History/Cover entries explain the existing production entry points.

## Visual language

Keep warm paper `#FFFCF5`, sage workspace `#E8EDE3`, forest `#304337`, muted green `#59694F` and the existing clay accents as the interface theme. Background fields also offer a custom colour picker and typed hex value: the owner explicitly requested any RGB colour, with garden swatches retained as convenient presets. Invalid/incomplete values stay in the input with an error and do not replace the last valid colour.

Use Arial for controls and Georgia for garden headings, with H1–H4 / paragraph / small only. A slim rail and 320 px desktop panel preserve a generous fluid canvas. Palette cards use approximately 64 px desktop / 56 px mobile heights, with at least 44 px touch actions. Shared native select elements use an inset chevron (about 14–16 px from the edge), enough trailing padding and clear hover/focus states. No email-marketing features, AI actions, comments, arbitrary font catalogue, preview/publish controls or undo/redo are implied by the reference.

## Implementation constraints

Use Puck's existing editor state, inline field integration and the same public renderer. Preserve server-side validation, stable page links, private media gateways, serialized autosave, history and recovery. Inline text editing must retain caret and IME composition through acknowledgements and safe remote merges. Formatting requires an allowlisted representation and server validation: never reinterpret legacy plain strings as HTML, and never render untrusted pasted HTML or arbitrary style strings.

The official [Puck inline rich-text guide](https://puckeditor.com/docs/integrating-puck/rich-text-editing) documents the existing library's inline field capability. Prototype DOM editing is disposable interaction scaffolding and is not the production integration.

## Review artifacts

The proposed desktop states belong together on **Desktop admin** and the mobile states on **Mobile admin** in `Our Memory Garden.figcraft`, arranged side by side below the current editor group. Existing approved screens and links are retained. New frame IDs and verification evidence will be appended after rendering.

Open `src/components/editor-inline.prototype.html` directly, or run `npm run prototype:editor` and visit `http://127.0.0.1:5174/`. The server serves only the prototype file. The prototype has no persistence, authentication, uploads or real page mutations. Its visible state summary distinguishes sample editing from a saved garden page.

## Native proposal frames

Fifteen new editor states sit in an aligned second row below the existing editor group; one select-control reference joins General styles. They retain the five-page organisation and every previously approved screen.

| FigCraft page  | State               | Frame ID |
| -------------- | ------------------- | -------- |
| Desktop admin  | Content palette     | 3064     |
| Desktop admin  | Inline writing      | 3065     |
| Desktop admin  | Direct image action | 3066     |
| Desktop admin  | Column chooser      | 3067     |
| Desktop admin  | Photo chooser       | 3068     |
| Mobile admin   | Live canvas         | 3069     |
| Mobile admin   | Inline writing      | 3070     |
| Mobile admin   | Style sheet         | 3071     |
| Mobile admin   | Column sheet        | 3072     |
| Mobile admin   | Photo sheet         | 3073     |
| Desktop admin  | Drag into position  | 3074     |
| Desktop admin  | Custom colour       | 3075     |
| Mobile admin   | Custom colour       | 3076     |
| General styles | Select controls     | 3077     |
| Desktop admin  | Page settings       | 3078     |
| Mobile admin   | Page settings       | 3079     |

The CLI authoring pass adds 180 navigation interactions (including a drag transition) and two named prototype flows. Font validation reports no missing families. The preservation audit retains all 2,669 approved nodes, modifying only General styles' appended children and the two admin pages' appended children/flows. The complete native file has 3,612 nodes and 651 navigation actions, all targeting valid frames. The native states illustrate selection, toolbars and sheets; typing, colour input, nested drag movement and column preservation are demonstrated in the separate HTML prototype. These states supplement the old approved design until the owner approves replacing its editing interaction.

Review evidence and CLI audit are retained under the task's `editor-inline/` artifact directory. Real Chrome checks confirmed palette insertion, cross-column movement, self-drop rejection, custom/invalid hex values, metadata controls and mobile navigation with no page-wide horizontal overflow. This is interaction-design evidence; the backend and released Puck editor are unaffected.
