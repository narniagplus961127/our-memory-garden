# Inline editor refinement

Status: approved on 2026-11-02; implemented and verified on 2026-11-03. Ticket: [14](../.scratch/our-memory-garden/issues/14-inline-editor-experience.md).

The owner requested a Klaviyo-like editor that allows writing directly in the widget. This refinement changes the main editing interaction; the existing released application and its completed tickets remain the baseline. The native FigCraft proposal and disposable HTML interaction prototype are review artifacts, not a claim of production implementation.

## Interaction model

Click a block to select it; click its text to place the caret and write. Selection reveals an outline, a compact block action bar and contextual styles. Inline formatting floats absolutely above the scrolling canvas while the selected block has an active text field. It is hidden/inert otherwise and follows selection rather than hover. A constant clearance and a separately clipped scrolling viewport prevent layout shift and caret occlusion (ticket 22). The sidebar contains appearance controls rather than a separate text-entry form. Escape leaves text editing, retaining the selected block. A Back to content control returns to the palette.

The Content palette starts with Section, then Text, Image, Button, Page grid and Columns. Blank pages are empty: Add Section is the first action and block/Column creation is unavailable until a Section exists. Sections belong at page level; blocks and Columns go inside Sections or their descendant columns (ticket 30). Banner and Gallery remain supported for existing documents but are absent from new choices and templates. The narrow rail switches Content, Styles, Outline and Page settings. The main canvas uses the available width; desktop/mobile controls change only the editing viewport. Image Styles includes an optional garden-page/external link; only the image is linked in the saved website, while editor selection and caption controls remain usable (ticket 29).

Drag palette blocks to insertion lines inside Sections/columns. Drag Sections into page-level positions. Existing blocks use a dedicated handle; typing does not start a drag. Root and slot acceptance lists reject invalid nesting, and Move controls exclude self/descendant targets. Add buttons and sibling moves provide touch/keyboard alternatives. Old root blocks remain editable and may move into Sections; opening a page does not rewrite it.

Section Styles uses labelled, collapsible groups in this order: Background image, Content background, Section colour, Border, Spacing, Column content alignment. Content background uses Auto/Custom/None segments; Auto is theme paper, Custom reveals picker/hex, None is transparent. Section colour/image is the outer layer and content background is behind the inner blocks. Border supports 0–12 px, a custom colour and existing corner radius. Spacing retains four independent sides. Top/Centre/Bottom segments align unequal-height column contents vertically. Background photos come from the existing shared library and obey the same public/private access, usage and deletion rules. The owner-requested Section reference is implemented directly in the application; native FigCraft frames have not been redrawn for this increment.

The column chooser offers one to four columns and visual proportion presets. Changing a two-column legacy arrangement retains its data. Reducing columns must explain that removed-column contents move into the final retained column in reading order; it must never discard them silently. The prototype demonstrates selection and layout choice, while the production migration/validation belongs to implementation.

Mobile keeps the canvas visible with a compact toolbar. Styles open in a dismissible sheet; formatting controls can scroll within their own toolbar without causing page-wide horizontal scrolling. All actions have 44 px touch targets and accessible names. Keyboard focus and selection return to the edited block when the sheet closes.

The top bar keeps an editable title, Back to Pages, View page and History visible. View page opens the saved website in a new tab via stable page ID, or `/` for the homepage; it is not an unsaved preview. Page settings moves to a distinct labelled rail/sidebar entry and exposes title, URL, visibility, optional date, category, cover photo, sharing description and indexing. On mobile it opens a taller scrolling sheet. Production navigation retains existing autosave/leave/recovery behavior. This owner-requested ticket 21 refinement supersedes the earlier prototype's top-bar Page settings/Dashboard controls; the native FigCraft file has not been redrawn for this incremental change.

Button Styles begins with destination, appearance variant, Fit content/Full width, button background and text colour, then alignment and surrounding block appearance. Full width fills the containing section/column, not the entire website. Colours accept a picker or hex value; Default restores the appearance variant. Surrounding Background colour remains independent. Existing inline word colours still take precedence for explicitly styled words. Keep all controls accessible with 44 px touch targets and no page-wide overflow.

## Visual language

Ticket 22 adds Show page title in Page settings, default on, stored in the page layout's optional boolean root property. Hiding applies `display: none` to the generated website heading/container; it does not change the editable page name, authored headings, sharing title or navigation. Rich-text preparation, autosave snapshots, merging and history preserve the setting; older absent values remain visible. No database migration is needed. The homepage's automatic eyebrow is removed, and legacy Banner's decorative eyebrow is hidden on the homepage without rewriting its content.

Editor settings use 8 px label/field gaps and 24 px between groups, matching left/right gutters, 44 px minimum controls and shared 6 px corners. Labels and form inputs/selects/textareas use 14 px text; helper text is 13 px. Ticket 23 applies that shared form-text size to the editor title field and numeric toolbar input too, while authored website typography remains independently configurable. Create/Rename category actions share one row. Cover/sharing pickers use one visible label each and full-width actions; sharing fields sit under a clear section heading. The icon rail keeps vertical overflow but never a horizontal scrollbar. These owner-requested refinements extend the approved native FigCraft design; the native frames have not been redrawn for this increment.

The public Garden dashboard entry is now a labelled 48 px floating grid icon at the bottom-right, with tooltip, keyboard focus treatment and safe-area spacing on mobile. It replaces the public header/menu text action and keeps `/admin` routing. Page-end clearance prevents it from covering the final content.

Keep warm paper `#FFFCF5`, sage workspace `#E8EDE3`, forest `#304337`, muted green `#59694F` and the existing clay accents as the interface theme. Background fields also offer a custom colour picker and typed hex value: the owner explicitly requested any RGB colour, with garden swatches retained as convenient presets. Invalid/incomplete values stay in the input with an error and do not replace the last valid colour.

Use Arial for controls and Georgia for garden headings, with H1–H4 / paragraph / small only. A slim rail and 320 px desktop panel preserve a generous fluid canvas. Palette cards use approximately 64 px desktop / 56 px mobile heights, with at least 44 px touch actions. Shared native select elements use an inset chevron (about 14–16 px from the edge), enough trailing padding and clear hover/focus states. No email-marketing features, AI actions, comments, arbitrary font catalogue, preview/publish controls or undo/redo are implied by the reference.

## Implementation constraints

Use Puck's existing editor state, inline field integration and the same public renderer. Preserve server-side validation, stable page links, private media gateways, serialized autosave, history and recovery. Inline text editing must retain caret and IME composition through acknowledgements and safe remote merges. Formatting requires an allowlisted representation and server validation: never reinterpret legacy plain strings as HTML, and never render untrusted pasted HTML or arbitrary style strings.

The official [Puck inline rich-text guide](https://puckeditor.com/docs/integrating-puck/rich-text-editing) documents the existing library's inline field capability. Prototype DOM editing is disposable interaction scaffolding and is not the production integration.

## Review artifacts

The proposed desktop states belong together on **Desktop admin** and the mobile states on **Mobile admin** in `Our Memory Garden.figcraft`, arranged side by side below the current editor group. Existing approved screens and links are retained. New frame IDs and verification evidence will be appended after rendering.

On the separate `prototype/editor-inline-experience` branch at `57406c8`, open `src/components/editor-inline.prototype.html` directly, or run `npm run prototype:editor` and visit `http://127.0.0.1:5174/`. The server serves only the prototype file. The prototype has no persistence, authentication, uploads or real page mutations. Its visible state summary distinguishes sample editing from a saved garden page.

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

The CLI authoring pass adds 180 navigation interactions (including a drag transition) and two named prototype flows. Font validation reports no missing families. The preservation audit retains all 2,669 approved nodes, modifying only General styles' appended children and the two admin pages' appended children/flows. The complete native file has 3,612 nodes and 651 navigation actions, all targeting valid frames. The native states illustrate selection, toolbars and sheets; typing, colour input, nested drag movement and column preservation are demonstrated in the separate HTML prototype. The owner approved these states and the interaction prototype at commit `57406c8` on 2026-11-02. They replace the previous editor interaction as the implementation reference.

Review evidence and CLI audit are retained under the task's `editor-inline/` artifact directory. Real Chrome checks confirmed palette insertion, cross-column movement, self-drop rejection, custom/invalid hex values, metadata controls and mobile navigation with no page-wide horizontal overflow. This is interaction-design evidence; the backend and released Puck editor are unaffected.

## Implemented integration

### Inspector visual refinement — ticket 24

The owner requested the appearance of the [Klaviyo editor reference](https://www.klaviyo.com/email-template-editor/Sa5Cu7) on 2026-11-03. The application now uses a white, rounded desktop inspector and workspace, soft mint canvas surround, subtle dividers and forest active accents. The 352 px inspector track provides consistent 20 px internal gutters; mobile retains the bounded scrollable sheet. Existing properties are grouped into initially expanded native disclosures for content/link, layout, background, spacing and corners. Hidden fields remain hidden, and future ungrouped visible fields retain a fallback section.

Button width uses an inset segmented tray; colour controls join the native picker and hex input, with smaller visual swatches inside 44 px targets. Four-side spacing fields show inline px units. Consistent SVG rail, back/collapse and device icons replace mixed character symbols. New block cards are 56 px on both devices. The selected block actions use a lighter surface, retaining the dedicated drag handle and movement controls. The absolute formatting bar and its separately clipped canvas viewport retain stable clearance on both devices.

This implements the owner's requested reference in the application. The native FigCraft file has not been redrawn. No extra email, crop, AI, undo/redo or preview features are implied. Evidence uses synthetic local content: [desktop](evidence/ticket24/inspector-desktop.png), [mobile](evidence/ticket24/inspector-mobile.png).

### Alignment and responsive placeholders — ticket 20

The owner's 2026-11-03 screenshots identified mismatched public-header baselines, a crowded move action, uneven native field gutters, the raised font-size label and overflowing placeholders. Root navigation links now share a 48 px text row with the dashboard action. The editor uses Puck's fields override and disables its extra wrapper padding, so native and custom properties share the same panel gutters. Labels and inputs retain their associations; movement groups use 8 px internal gaps and 16 px spacing before the move action.

The font-size field is a single 44 px control with an inline `px` suffix and an accessible label. It aligns with adjacent selects, keeps visible keyboard focus and preserves existing numeric commit/cancel behaviour. More's pinned mobile trigger has an opaque disabled background so scrolled content does not show through it.

Photo placeholders take their block's actual width. Their minimum height, artwork, text and contain-mode padding respond to the image container, avoiding the old aspect-ratio/minimum-height combination that expanded a placeholder beyond its column. Choose/replace actions move below narrow placeholders; mobile leaves room beside the native floating block controls. The same placeholder styles are used publicly. This is a correction to the approved fluid layout, without changing saved content or image data.

Evidence: [desktop columns](evidence/ticket20/placeholder-desktop.png), [desktop settings](evidence/ticket20/settings-desktop.png), [mobile settings](evidence/ticket20/settings-mobile.png).

### Compact toolbar and typography — ticket 19

The owner supplied a newer Klaviyo toolbar reference and explicitly requested fonts and line height on 2026-11-03. Keep a single stable 64 px row with Body/H1–H4/Small, font family, size, colour, Bold and Link. A labelled More action opens an anchored top-layer popover for italic, underline, alignment, letter spacing, paragraph line height and reset. It contains 44 px controls and short helper text, adjusts its placement on resize, stays bounded on short screens and keeps its trigger reachable at the mobile toolbar's right edge. Escape and the explicit close action return focus to the selected text; outside dismissal leaves focus with the clicked destination. The original selected range remains the formatting target.

Font options are Site default, Arial, Helvetica, Georgia and Verdana, using installed fonts/browser fallback without network font requests. Line height is a 1–3 unitless multiplier on paragraphs/headings; blank restores inherited line height. Font family is an allowlisted inline mark attribute. Paragraph CSS accepts only supported alignment and line height. Reset removes font/colour/size/letter spacing from selected words and restores paragraph line height.

The review also reproduced and fixed a zero-width desktop canvas when the sidebar closed: an explicitly placed third grid column keeps the canvas visible when the hidden panel leaves grid flow. Existing typography, styling and page navigation remain intact. No Preview, Undo or Redo is introduced. Native FigCraft frames have not been redrawn for this extension; these implementation notes and the [desktop](evidence/ticket19/toolbar-desktop.png) / [mobile](evidence/ticket19/toolbar-mobile.png) evidence record the latest owner-requested controls.

### Text appearance and spacing refinement — ticket 17

The owner requested this extension on 2026-11-03. The persistent toolbar adds labelled font-size and letter-spacing fields, a text-colour action and a reset for those three appearance settings. Numeric edits apply on Enter or blur, Escape cancels, and invalid values revert to the current value. Text colour opens a centred responsive dialog with garden swatches, a native picker and typed hex input; Apply is disabled for invalid colours. Styling affects the selected words or subsequent typing, preserving the selection when controls take focus. Existing H1–H4/paragraph/small, bold/italic/underline, alignment and safe links remain available.

Styles shows explicitly labelled Background colour, Padding and Margin. Each spacing group has Top/Right/Bottom/Left inputs, a short inside/outside explanation and its own reset. Blank means inherited template styling; legacy all-side padding remains effective and is explained when present. Nonnegative spacing is limited to 120 px. This retains existing defaults and avoids converting old pages merely by opening them.

The entire palette card's draggable surface uses grab/grabbing and disables text selection; its separate Add action retains a pointer cursor. Canvas text retains a text cursor and normal selection. Existing blocks move with the labelled dedicated grip. The floating formatting bar remains 64 px high, with stable clearance above the scroll viewport; mobile exposes a “Swipe tools for more” hint. A scrolling bottom sheet keeps each spacing control reachable without widening the page. The garden document contains outer margins so the canvas measures the complete content height.

These changes extend the approved native FigCraft states; the native file itself has not been redrawn in this refinement. Current implementation evidence: [desktop](evidence/ticket17/editor-desktop.png), [mobile colour dialog](evidence/ticket17/text-colour-mobile.png), [mobile spacing](evidence/ticket17/spacing-mobile.png).

The application now uses Puck 0.24's native inline rich-text fields and dedicated drag handles. Writing and formatting operate on the canvas; shared appearance fields remain in Styles. Native drag destinations support nested sections and one to four columns. Add buttons, sibling movement and explicit destination/position controls provide keyboard and touch alternatives.

Ticket 15 corrected workspace stability; ticket 22 refines that model with an absolute floating toolbar, hidden/inert without an active selected text field. The focused editor remains independent of native contextual-menu hover changes. The canvas viewport keeps constant clearance and clips below the floating bar, so tools never cover a scrolled caret. Puck's slot callbacks are invoked as render functions to preserve nested editor identity when slot contents change. Native block actions continue to belong to their canvas blocks. Link, column and photo dialogs use explicit viewport centering and bounded scrollable heights. Toolbar control rules apply only to direct children, preserving full-width dialog fields and consistent label/action spacing.

An explicit allowlisted HTML field accompanies each edited plain-text field. Legacy strings stay literal, and simply opening a legacy page does not save a conversion. The public renderer uses the same block configuration. The server validates formatting, colour, spacing, safe destinations and active column contents before accepting a save. Inline links use stable page IDs. Removing an inline link removes its obsolete legacy reference too.

Page settings preserves the existing address/details recovery hooks. The header exposes title, visibility/save status and Pages, View page and History; the rail holds Page settings. Mobile sheets sit below their panel controls, reset their scroll position when switching panels and restore the editing selection on dismissal. The canvas expands to fit its content and uses one outer scroll area.

Conflict comparison treats equivalent legacy/inline text equally, displays formatting and link changes, and couples a changed column count with all its slot lists. A saved-layout choice cannot hide another editor's third/fourth-column additions. Sign-out notification follows successful server revocation, preventing other tabs from returning to the dashboard during logout. A photo-library response cannot replace a photo uploaded while that response was in flight.

Desktop/mobile screenshots use synthetic local fixture content. Composition events and caret retention are browser-tested; actual operating-system IME keyboards and OS colour-picker appearance remain device-dependent. Mobile pointer dragging is supplemented by the verified tap and move controls.

Verification: all 128 applicable desktop/mobile browser cases pass across the complete 130-case run and targeted photo rechecks. The complete run reported 125 passes, three immediate-image-dimension assertion failures and two intentional device skips; all four gallery/media cases passed after waiting for image loading. Sequential hex typing also passes on both devices. All 64 API cases are verified across the complete run and the isolated 12-case export rerun. TypeScript, Prettier and the optimized production build pass. [Implementation review](editor-inline-review.md), [desktop evidence](evidence/ticket14/editor-desktop.png), [mobile evidence](evidence/ticket14/editor-mobile.png).
