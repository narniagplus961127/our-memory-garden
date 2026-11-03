# 22 — Stable nested typing, page presentation and consistent controls

Status: resolved

## Request

Fix first-character focus loss after adding text inside a new column. Add Show page title (default on), remove the homepage eyebrow and improve settings alignment, spacing and control sizing. Owner follow-ups: remove the icon rail's horizontal scrollbar, make inline formatting float and hide when unnecessary, and move Garden dashboard from the public header to a bottom-right floating icon.

## Acceptance

- Real sequential typing in newly added nested text retains the editor/caret before and after autosave on desktop/mobile. Preserve nested drag/drop and touch alternatives.
- Page settings offers Show page title, default on, saved in the page layout. Hidden headings use CSS `display: none` without changing the page name, SEO/sharing, navigation or body content. Preserve the setting through ordinary edits, concurrent merges, recovery and history; accept only the supported boolean root property.
- Remove the homepage's automatic eyebrow and hide legacy Banner's decorative eyebrow on the homepage, without rewriting stored content.
- Use shared 44 px control minimum height and 6 px radius, with equal panel gutters, 8 px label/field gaps and 24 px between field groups. Simplify category actions, remove duplicated photo labels and group sharing controls clearly.
- No horizontal scrollbar in the icon rail; vertical scrolling remains available. All four mobile panel actions fit.
- Inline formatting is absolutely positioned over the workspace, hidden and inert without an active selected text editor. Reserve constant clearance so showing/hiding it never shifts content; hover must not drive visibility. Keep mobile toolbar scrolling, selection, modal focus and More behaviour.
- The public header has no Dashboard text action. A labelled 48 px floating icon links to `/admin` from the bottom-right, with tooltip, focus indication, mobile safe-area spacing and clear space after the page content. Existing signed-in/anonymous routing stays intact.
- Update spec/design notes, verify, commit/push and release through production Git integration.

## Diagnosis

The exact keyboard repro failed repeatedly after the first character: the text became “A”, but the rich text element was inactive. Tagged lifecycle probes showed the nested text editor being destroyed/recreated, with no document-sync `setData` call. Puck's changing slot callback was rendered as a React component. Calling the supported slot render function retains its returned component identity. See the [upstream slot identity issue](https://github.com/puckeditor/puck/issues/1773) and [slot API](https://puckeditor.com/docs/api-reference/fields/slot). No package patch or upgrade is needed. Probes were removed after the fix.

## Verification

- The keyboard repro failed repeatedly after one character before the slot-render fix. The final desktop/mobile repro retains focus through individual keystrokes, autosave acknowledgement and reload. Phone Select all is emulated with a visible DOM range because an OS selection menu is unavailable in emulation; subsequent typing uses real keyboard events without refocusing the field.
- All 24 editor cases pass, covering the new presentation controls plus existing formatting, caret/composition, metadata, conflicts, column preservation, button colours/width and navigation. Ten affected cases were rechecked after the final clipping change, and both title cases were rechecked after hiding tools during page-metadata editing.
- Eleven additional layout/navigation/drag cases pass. Three intentional skips cover desktop's absent mobile menu, mobile's separate header, and mobile's touch movement alternative to native pointer dragging. Signed-in/anonymous dashboard navigation uses the floating icon successfully.
- Seventeen API cases pass, covering block validation, trusted-base merges, concurrent writes and presentation validation/history. The new presentation case was rechecked after default-visible equivalence was refined. Hiding a title does not convert unedited legacy rich text.
- A geometry check caught the first floating-toolbar version overlapping the scroll viewport (toolbar bottom 205 px, viewport top 134 px). Constant clearance is now outside the scrolling area, keeping its clipping boundary below the tools at all scroll positions; desktop/mobile checks pass.
- TypeScript, Prettier and optimized production build pass (final compile 3.7 seconds; TypeScript 2.1 seconds; nine static pages generated). No package changes, database schema changes or production content edits. Temporary probes are removed; browser artifacts stay under ignored `work/`.

## Answer

Sections and columns invoke Puck's slot render functions, preserving nested editor identity and the caret. Show page title is an optional boolean page-layout setting, visibly on by default; CSS hides only the generated heading/container. Rich-text preparation, merge/snapshot paths and conflict text editing retain the root setting. Old absent values remain visible, and history can restore either representation.

Controls share a 44 px minimum and 6 px corners, with 14 px labels, 16 px inputs, 13 px helpers, 8 px label gaps and 24 px field groups. Category actions sit side by side; photo pickers have one visible label; the rail has no horizontal overflow. Inline tools float over stable reserved clearance, hide/inert when no text field is selected or a page/content/outline panel is open, and never cover the scroll viewport. The public Dashboard entry is a labelled 48 px floating icon with the original protected `/admin` route and mobile safe-area spacing.

The spec and interaction notes describe the current owner-requested extension. Native FigCraft frames were not redrawn for this increment. Screenshots use synthetic local content: [settings](../../../docs/evidence/ticket22/settings-desktop.png), [mobile title toggle](../../../docs/evidence/ticket22/settings-mobile.png), [floating formatting](../../../docs/evidence/ticket22/floating-toolbar-desktop.png), [dashboard shortcut](../../../docs/evidence/ticket22/dashboard-shortcut.png).
