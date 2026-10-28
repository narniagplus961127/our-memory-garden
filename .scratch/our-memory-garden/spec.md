# Our Memory Garden specification

Status: ready-for-agent

## Problem Statement

Two partners want a personal website to preserve and share their lives through photographs and written content. They need to shape the site themselves on mobile and desktop, keeping selected pages private without relying on a developer for every change.

## Solution

Create a botanical garden-themed website with a public-facing garden and a shared administration dashboard. Administrators create and arrange pages using templates and visual blocks. A clickable Figcraft prototype must be designed and confirmed before development begins.

## User Stories

1. As a visitor, I want a welcoming homepage, so that I understand whose garden I am exploring.
2. As a visitor, I want to browse public pages and navigation, so that I can explore the garden.
3. As a visitor, I want readable pages on my phone, so that I can explore comfortably.
4. As a visitor, I want to enlarge gallery photos and navigate between them, so that I can appreciate the photographs.
5. As a visitor, I want photo captions when provided, so that I can understand their context.
6. As a visitor, I want private pages to appear not found, so that private content stays inaccessible.
7. As an administrator, I want my own login and password recovery, so that I can securely manage the site.
8. As an administrator, I want no public registration, so that access is limited to the two of us.
9. As an administrator, I want equal editing privileges, so that either of us can maintain the garden.
10. As an administrator, I want to create a page from a template, so that I can start with a useful layout.
11. As an administrator, I want to freely change a page made from a template, so that it becomes our own.
12. As an administrator, I want new pages to default to private, so that I can prepare them before sharing.
13. As an administrator, I want to switch a page between public and private, so that I control its audience.
14. As an administrator, I want to edit the public homepage with the same blocks, so that its content can evolve.
15. As an administrator, I want to add, edit, reorder and remove blocks, so that I can compose pages visually.
16. As an administrator, I want banners, text, single photos, galleries and grids, so that I can tell varied stories.
17. As an administrator, I want a live editing canvas and controls, so that I can understand my changes without a separate preview button.
18. As an administrator, I want usable editing controls on my phone, so that I can manage pages anywhere.
19. As an administrator, I want move-up and move-down controls as well as dragging, so that I can reorder blocks easily on mobile.
20. As an administrator, I want changes saved automatically and reflected publicly, so that I do not need a save button.
21. As an administrator, I want to see saving, saved and failure states, so that I know whether my work is safe.
22. As an administrator, I want unsaved changes retained and retryable during connection problems, so that my work is not lost.
23. As an administrator, I want simultaneous changes to different blocks preserved, so that both of us can edit together.
24. As an administrator, I want a warning for conflicting edits to the same block, so that we can avoid overwriting each other.
25. As an administrator, I want useful page version history and restoration, so that I can recover from mistakes.
26. As an administrator, I want deleted pages kept in trash until permanently deleted, so that I can recover them.
27. As an administrator, I want restored pages to return private, so that I can review them before sharing again.
28. As an administrator, I want warnings about links to a page before deleting it, so that I understand the effect.
29. As an administrator, I want optional dates, categories and cover photos for pages, so that I can organize them.
30. As an administrator, I want to create and rename categories, so that the organization can evolve.
31. As an administrator, I want a page grid with manually chosen pages or category-based selection, so that I can present related pages.
32. As an administrator, I want private pages hidden from public grids, navigation and search, so that visitors see only permitted pages.
33. As an administrator, I want to create and reorder menu items including nested items, so that navigation reflects our garden.
34. As an administrator, I want menu links to point to pages or external sites, so that navigation can include both.
35. As an administrator, I want text links to select a page or external address, so that I can connect content.
36. As an administrator, I want internal page references to survive address changes, so that our navigation remains intact.
37. As an administrator, I want to choose and change page addresses, so that URLs are meaningful.
38. As an administrator, I want a shared media library, so that both of us can upload and reuse photos.
39. As an administrator, I want to search the library and see photo usage, so that I can find and manage images.
40. As an administrator, I want a warning and deletion prevented while a photo is in use, so that pages do not unexpectedly lose it.
41. As an administrator, I want to see whether a photo is publicly accessible, so that I understand its visibility.
42. As an administrator, I want originals retained and display versions optimized, so that photos load quickly and remain exportable.
43. As an administrator, I want metadata removed from displayed copies, so that visitors do not receive hidden location information.
44. As an administrator, I want an export of content and original photos, so that we can retain independent backups.
45. As an administrator, I want controls for public-page search indexing and sharing details, so that we can manage discovery.
46. As an administrator, I want to monitor storage use, so that I can decide whether to upgrade.
47. As a project owner, I want to review a clickable prototype before development, so that design and flows are confirmed first.
48. As a project owner, I want the source eventually stored on GitHub and production deployed to Vercel, so that the site can be maintained and hosted.
49. As an administrator, I want to see my local unsaved changes after a browser refresh when recovery is possible, so that I can retry saving them.
50. As an administrator, I want device-local recovery copies cleared after successful saving or sign-out, so that private edits are not unnecessarily retained.
51. As an administrator, I want to compare conflicting text and choose which version to keep, so that neither person's work is silently lost.
52. As an administrator, I want contested moves and deletions to require a choice, so that unsaved work is preserved.
53. As an administrator, I want to switch the editor canvas between desktop and mobile sizes, so that I can check the layout while editing.
54. As an administrator, I want sections and columns, so that I can arrange blocks in flexible layouts.
55. As an administrator, I want to select a public page as the homepage, so that we can change the garden's entrance.
56. As an administrator, I want the media library to show photo usage and accessibility, so that I understand where a photo appears.
57. As a project owner, I want to try a local Puck experiment with sample content before design approval, so that we can validate the editing experience.
58. As a project owner, I want the admin workspace to be visually distinct from the public site, so that I can tell when I am editing.

## Implementation Decisions

- **Design and validation gate:** The desktop and mobile FigCraft screens, general styles, logo and favicon are the visual reference, subject to owner approval. First create a disposable local Puck experiment using sample content and local storage; test text editing, image placeholders, sections, columns, block movement, device views, and simulated saving and recovery on desktop and mobile. Review it with the corrected FigCraft prototype before approving the design and beginning full implementation. Do not treat placeholder data or simulated controls as working application behavior. Resolve missing or conflicting design states before implementing the affected behavior.
- **Stack and deployment:** Use React, TypeScript, Tailwind CSS, Supabase PostgreSQL, Auth and Storage, and Puck's open-source React editor. Plan to store the source in GitHub and deploy the frontend to Vercel production, without preview deployments. Start on free hosting and monitor storage; the owner may upgrade later.
- **Accounts:** Provision two separate administrator accounts privately, with equal access and email-based password recovery. There is no public registration. Administrators manage the garden and can see private pages.
- **Pages and visibility:** A page is the sole content type. New pages default to private; there is no draft state. Administrators may switch a page between public and private. Anonymous visitors receive not found for a private page, and private pages are excluded from public menus, grids and search. Enforce access at the page, data and media boundaries, not just in the interface.
- **Homepage:** The homepage is a normal editable page using the same blocks and is always public. Administrators can select another public page as the homepage. Prevent deletion until another homepage is selected.
- **Page identity and links:** Pages can have optional dates, categories and cover photos. Public text links to a private page remain visible but lead visitors to not found. Internal references use stable page identifiers, so menu and text links survive an address change. Changing a page address removes the old address; previously shared external links to it stop working.
- **Navigation and organization:** Administrators create and rename categories; manage ordered, optionally nested menu items linked to pages or external URLs; and add page grids that select pages manually or by category. Grids respect page visibility. Public pages have title, description, cover-image and per-page search-indexing controls.
- **Puck editor:** Register the garden's own React blocks and render saved page data with those same components. Persist page structure through authenticated application code in Supabase. Theme and compose the editor to match the approved FigCraft design. Puck overrides and plugins may be experimental; isolate customizations and verify compatibility on upgrades. Validate mobile editing, accessible non-drag controls, nested layouts, device views, auto-save recovery and concurrency rather than assuming the library supplies them.
- **Blocks and templates:** Support text, banner, image, gallery, button and page-grid blocks plus section and column layouts. Administrators can add, select, edit content and style, move, duplicate and remove blocks. Templates supply an initial layout; pages created from them are independent. Prepare the initial templates during development; a template editor is out of scope.
- **Editor presentation:** On desktop, show a block palette or contextual block settings beside a large page canvas. On mobile, use a compact editor bar and a touch-friendly opening content/settings panel, with tap-to-add and move-up/down alternatives. Provide desktop/mobile canvas view controls and show page visibility and save status. The live canvas is the editing view: no separate Preview or Publish button, and no undo/redo controls.
- **Auto-save and recovery:** Auto-save changes without a save button; saved changes to public pages become visible immediately. The canvas can show local unsaved changes, but must clearly display saving, saved and failure states. Retain unsaved work for retry and attempt recovery after refresh or closure on the same device; mark recovered edits unsaved until persistence succeeds. Clear device-local recovery copies after successful saving or sign-out. Production persistence and recovery require verification beyond the local experiment.
- **Concurrent edits and history:** Preserve independent edits to different blocks where safe. For conflicting edits to the same text block, retain the second administrator's local text and offer their version and the saved version, with choices to keep local, accept saved, or copy and edit manually. Durably preserve the saved version before replacing it. Contested moves or deletion of the same block require a choice without discarding unsaved work. Group adjacent edits into useful versions and offer history and restoration; full live collaborative text editing is not required.
- **Page deletion:** Warn about inbound links before deleting a page. Keep deleted pages in trash until an administrator explicitly deletes them permanently. Restored pages return as private.
- **Media:** Administrators share a searchable media library and can inspect a photo's page usage and public-access status. Prevent deleting a photo while it is referenced. A display photo used on any public page is publicly accessible, including if also used on a private page; restrict it when no public use remains. Previously downloaded copies cannot be recalled. Retain originals for administrator download and export; deliver optimized display copies with metadata removed. Protect originals and private-only media.
- **Backups and settings:** Provide an export of page content and original photos for independent backup. Settings provide entry points for homepage selection, account recovery, storage usage and export. Confirm the actual source of storage usage and plan information; mockup values are not live data.
- **Visual direction:** Use a warm, soft botanical journal with pots, flowers, plants, fences, small-farm motifs and occasional garden, safari or undersea animals. Use one light theme, subtle motion respecting reduced-motion preferences, and H1–H4, paragraph and small typography. Public pages use warm parchment; the admin workspace uses a distinct sage tint and dedicated navigation.
- **Layout and admin navigation:** The page canvas is fluid with no fixed page-wide maximum width; images and section backgrounds can extend edge to edge. Keep left/right gutters consistent and responsive. The current desktop reference uses 64 px outer gutters and equal sidebar padding, while mobile uses 28 px gutters. Desktop admin screens use a sidebar containing the brand, navigation, View website and account/sign-out controls, without the public header. Mobile admin screens use a compact bar and menu.
- **Implementation sequence:** Ticket 00 is the local design-phase Puck experiment; ticket 01 covers design review and approval. Tickets 02–04 establish a private page, visibility and the first Puck editor slice with basic authenticated auto-save and an image placeholder. Secure photo upload, galleries and grids follow. Ticket 09 establishes robust recovery, concurrency handling and the minimum durable saved-version preservation needed for conflicts; ticket 10 adds the history and restoration interface.

## Testing Decisions

- Test externally observable behavior and authorization, not internal implementation details. The primary seam is the running application through public and authenticated journeys on desktop and mobile; use targeted service-level checks where necessary to establish security and concurrency reliably.
- Test access to public/private pages, display copies and originals, including visibility transitions, shared photos, private-page not-found behavior, and absence of private content in public lists.
- Test two-account access, the Puck editing and rendering flow, auto-save, failure/retry and recovery, independent and conflicting edits, durable version preservation, page history, trash, internal references, page grids and media deletion safeguards.
- Test navigation, template independence, homepage selection, export, settings entry points, responsive and keyboard operation, and reduced-motion behavior. Review the FigCraft prototype and local Puck experiment with the owners before approval.
- The experiment simulates local saving with sample data; it cannot prove production Supabase persistence, authorization, real network failures or multi-user conflict behavior. Verify those separately through the application and services.
- There is no existing application code or test suite in the project to use as prior art.

## Out of Scope

Public registration, visitor comments or reactions, a separate story content type, a template editor in the first version, dark mode, full real-time collaborative text editing, separate Preview or Publish controls, undo/redo controls, Cloudflare infrastructure and Vercel preview deployments.

## Further Notes

Use sample content in the prototype; the generated garden photo is illustrative, not a personal memory. The project currently has a FigCraft design, agent documentation, tickets and a dependency-only experiment folder; no application or working Puck experiment has been built. Ticket 01 and full implementation remain gated on the experiment and owner design approval.
