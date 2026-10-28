# Design and specification review

Reviewed and owner approved 2026-10-28 for ticket 01, based on commit `e11a9c0`. The native `Our Memory Garden.figcraft` document is the approved visual reference. The specification and tickets govern behavior and security. The design approval gate is satisfied and ticket 02 is unblocked.

## Design coverage

The document contains 53 separate screens across five pages: General styles & brand, Desktop website, Desktop admin, Mobile website and Mobile admin. Screens sit side by side within their group.

| Area | Desktop and mobile designs |
| --- | --- |
| Public website | Editable homepage example, page, gallery, login, password reset, generic not found; mobile website menu |
| Administration | Overview, pages, templates, media library, navigation, settings; mobile admin menu |
| Settings | Individual Homepage, Account, Storage and Export screens |
| Media | Photo details, public-access information, original download entry and in-use deletion safeguard |
| Puck editor | Private/public page, selected text settings, saving, saved edit, recovered unsaved edit, failure/retry and text-conflict comparison |
| Shared styles | H1–H4, paragraph, small, palette, components, logo, favicon, plant placeholder and editable garden cat motif |

Public pages use warm parchment and administration uses sage. The page canvas is fluid. Desktop outer gutters and sidebar padding use 64 px; mobile gutters use 28 px. Full-width images/backgrounds are exceptions. The editor uses its own toolbar and panels. There are no separate Save, Publish, Preview or Undo/Redo controls.

## Prototype review routes

Start Present from Desktop / Home or Mobile / Home. The links illustrate example states, not real authentication or persistence.

1. Garden dashboard (mobile: menu → Admin sign in) → Sign in → Dashboard → Create page → choose a template → private editor.
2. Select the paragraph, or Text in the palette → selected text settings → click the example content field → changed text with Saving… → click Saving… → saved edit.
3. Click PRIVATE → public editor; PUBLIC returns to private. Public editor examples illustrate visibility separately from the edited-text example.
4. Click saved status in the private editor → unsaved failure screen → retry or continue editing. Click saved status in selected text settings → compare the two text versions → keep mine, accept saved, or edit manually.
5. Use sidebar/menu entries to inspect pages, media, navigation and settings. Open individual settings and Photo details. Forgot password opens the reset design. Generic not-found screens are available directly in the website group for review.

The prototype intentionally uses clicks to advance examples. Status indicators are review shortcuts; the application must update them from actual persistence results. Input fields do not accept arbitrary text. Block dragging, nested movement, device-width switching and editing arbitrary content are exercised in the separately approved Puck experiment, not simulated as complete product behavior here.

## Validation evidence

- Native document audit: 5 pages, 53 top-level frames, 300 navigation actions; every destination exists and is a frame.
- Both desktop and mobile core route graphs pass: home → login → dashboard → templates → private editor → selected text → saving → saved edit → public editor (mobile includes its website menu).
- FigCraft player spot check: home → login → dashboard → private editor crossed the website/admin groups successfully. This is not a claim that every hotspot was exercised in the player.
- Render inspection: mobile homepage, saving editor and conflict comparison have readable content without clipping. Final CLI font inspection reported no missing fonts; the designs use Arial/Georgia and vector paths.
- Ticket 00's local Puck experiment is owner accepted, including the additional desktop/mobile exercise. Its sample/local-storage limitations remain recorded in ticket 00.
- Standards and specification reviews against owner-selected commit `0352905` found a ticket-comment heading issue and mismatched recovery sample text. Both were corrected and rechecked: no remaining findings in either axis. Recovery choices preserve the corresponding local or saved text; manual editing retains local text with a visible unsaved state.

## Implementation follow-through

The owner approved the broad visual shell and core editing flow. These later-ticket interactions still need their relevant states designed or refined before implementing them:

- Tickets 04–08: settings for non-text blocks, responsive panel opening, exact nested layout controls, page metadata/addresses/categories, grids and nested menu editing.
- Tickets 05–06: upload progress/errors, private-only and unused-photo variants, deletion confirmation/errors, and functional gallery stepping/captions.
- Tickets 09–10: production integration of recovered edits, contested reorder/delete choices, history, trash, inbound-link warnings and restore-as-private. Current conflict and failure screens establish copy and choices; persistence and durable saved-version preservation require implementation tests.
- Tickets 11–12: actual export completion/errors, live storage source, search/sharing controls and their feedback states.
- Ticket 02: reset-email submission/confirmation and new-password form states. The current reset page is an entry-point design; its neutral-confirmation note is a handoff annotation, not final application copy.

Do not infer privacy enforcement from hidden navigation or prototype links. Verify server-side administrator authorization, Neon persistence, public/private media boundaries, real network failures and concurrent edits in the application. Use approved design components for the remaining states and resolve material design changes with the owner before implementing the affected interaction.

The owner approved a backend change from Supabase to Neon in Singapore on 2026-10-28. This changes service integration, not the approved visual design. Managed authentication alone does not grant administrator access; the server must enforce the garden's administrator allowlist.
