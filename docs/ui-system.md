# Garden UI components

The owner approved standardizing the existing garden design with shadcn/ui and Tailwind on 2026-11-04. Keep the soft paper/sage/forest palette, Arial/Georgia typography, 14 px body/control text and responsive garden gutters. The migration changes shared interface construction, not authentication, stored page data or Puck's supported editing API.

## Sources

`components.json` configures the official shadcn registry. Components live in `src/components/ui/`; controls and button links throughout the application import these shared sources. Tailwind styles drive their states, spacing and variants. `globals.css` maps garden colours to shadcn semantic tokens; existing garden-specific layout/rendering rules remain. The garden's text-muted colour is named `--garden-muted` so it cannot collide with shadcn's muted surface token. Library-owned Puck controls keep their supported markup and garden styling.

Use Button (including `asChild` for links), Input, Textarea, Label, NativeSelect and Card rather than creating new control styles. Normal targets are 44 px, including icon actions. Keep native field semantics and keyboard/mobile selection; labels identify controls. Custom block spacing, content colours and Puck palettes remain independent of interface styling.

## Shared modals

`src/components/modal.tsx` composes shadcn Dialog with one centred, responsive, scrollable shell. It provides a title, optional description, consistent header/body/footer spacing and a top-right icon-only Close button with an accessible name. Focus is trapped, Escape closes when safe, busy mutations cannot be dismissed, and focus returns to the opener—including triggers inside the editor iframe. ConfirmationDialog composes this shell and initially focuses Cancel. Photo details/library, gallery, text colour/link, columns, public mobile navigation and confirmations reuse it.

Block removal uses the same confirmation from both canvas and sidebar, warns about nested children and keeps shared photos. Puck's direct delete action is disabled; an explicit confirmed action performs removal. Keep the default rich-text toolbar bridge when customizing the action bar.

Ticket 40 omits the padded body when a confirmation has only a title/description and actions. Confirmations have a 560 px maximum width; content-bearing warnings and retry errors still use the scrollable body. There is a single divider before the actions when no body is present.

## Optional editor links

New buttons start with No link. Optional button/image destinations can retain an empty page choice or empty external address as an inactive saved state. Use neutral helper text for these choices, not an alert or autosave failure. Valid configured links activate immediately; clearing a choice removes the link. Explicit No link suppresses legacy href fallback. A button without a valid destination renders a noninteractive span with its authored appearance. Non-empty malformed/unsafe addresses retain inline validation and local recovery; autosave waits for correction without sending a known-invalid request or showing a generic save-error toast. Genuine connection/server errors retain their toast and Retry save. Required Navigation destinations and the inline-link Apply action remain strict.

## Website shortcuts

The seedling icon remains in the bottom-right corner. Desktop hover and mobile tap reveal Dashboard; authenticated owners viewing an actual page also get Edit this page by stable ID. Anonymous and not-found screens never receive an editor shortcut. The popover supports keyboard, Escape, outside dismissal and hover travel between trigger and links.

Native FigCraft frames have not been redrawn for this implementation refinement; the approved garden visual direction remains unchanged. Application screenshots and functional checks are recorded in tickets 37–39.

## Category forms and destinations

Category management reuses the Navigation form and shared confirmation patterns: dedicated create/edit routes, 44 px right-edge icon actions, name-derived editable address, retained errors, explicit concurrent-change review and safe Cancel/focus return. The shared destination picker supports Category in menus, buttons, images and inline text. Public category collections reuse the public header/gutters and responsive PageGrid, with an empty state and public-only contents. Deleted category selections remain visibly unavailable rather than appearing silently reset.

Tailwind scans application sources (`src/`) explicitly so generated browser evidence does not participate in the development style watcher.
