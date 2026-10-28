# Design and specification review

Reviewed and owner approved 2026-10-28 for ticket 01, based on commit `e11a9c0`. The native `Our Memory Garden.figcraft` document is the approved visual reference. The specification and tickets govern behavior and security. The design approval gate is satisfied and ticket 02 is unblocked.

## Design coverage

The approved ticket 01 snapshot contains 53 separate screens across five pages: General styles & brand, Desktop website, Desktop admin, Mobile website and Mobile admin. Screens sit side by side within their group. Ticket 02 adds six account-recovery states using the same components, bringing that snapshot to 59 screens. Routine implementation-state follow-through on 2026-10-29 adds 38 separate reference screens (19 desktop/mobile pairs), bringing the current native document to 97 top-level frames across the same five pages. See `docs/design-state-reference.md` for exact frame IDs and field/action contracts.

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

The owner approved the broad visual shell and core editing flow. The routine UI follow-through is now recorded in 19 desktop/mobile reference pairs within that approved direction. These controls may be implemented using the contracts in `docs/design-state-reference.md`:

- Ticket 04: Banner, Image and Button settings; responsive opening settings panels; Section/Columns fields and explicit nested add targets, including empty slots; persistent sibling move, duplicate and remove actions.
- Tickets 05–08: gallery and page-grid settings; page title/address/date/category/cover controls; upload progress with per-file retry; private-only and unused-photo deletion/error patterns; nested navigation item editing and reusable page/external destinations.
- Tickets 09–10: contested reorder/delete choice, grouped history with read-only snapshot/restore confirmation, trash restore-as-private feedback and inbound-link/homepage safeguards. Existing recovery, save failure and text-conflict frames remain the reference for those flows.
- Tickets 11–12: export progress, ready/download and failure/expired-download patterns; storage source/freshness/refresh errors; public search-indexing and sharing controls, including private-page guidance.
- Ticket 02 follow-through is complete: desktop/mobile neutral reset confirmation, new-password and invalid/expired-link designs exist, and the corresponding local password-recovery journeys are verified. Managed delivery and owner sign-in remain part of production verification.

The references intentionally combine closely related controls and their inline feedback within a single interaction surface. They are separate screens, not a screen mosaic. Category create/rename, field validation, confirmation and minor error variants reuse the documented labelled-field, action and inline-feedback pattern rather than receiving a separate frame for every value. The gallery viewer reuses the existing gallery presentation with labelled stepping/close/caption behavior specified in the contract. Some references show adjacent example feedback variants for implementers; they are not simultaneous runtime states.

This completes the listed routine visual-state gap; it does not claim working media processing, safe multi-user persistence, export generation or live storage measurement. Implement and test actual state transitions in the application before declaring the affected ticket complete. Material departures from the approved direction still require owner review.

### State-reference validation (2026-10-29)

- FigCraft CLI native audit: 5 pages, 97 top-level frames, 38 new references, 2,669 nodes, 471 navigation actions. Every navigation destination exists and is a frame. All 1,530 authoring commands succeeded; no missing fonts.
- All new references fit their frame bounds; field values fit their input surfaces. They append side by side at y=100 after the existing matching admin frames. Existing approved nodes are unchanged except for the two admin pages' appended child lists.
- Render-inspected mobile Banner settings, Nested layout targets and Page details, plus desktop Banner settings, Private photo and Version history. The samples have readable type and no clipping. Desktop content uses 64 px outer gutters after the 240 px sidebar; mobile uses 28 px gutters. Long forms use taller scroll references.
- Render/audit evidence is retained in the task artifacts under `C:/Users/QW/.codex/visualizations/2026/10/28/01a1818b-b61d-7d30-b067-bc8107dbaffb/`: `design-audit.json`, `reference-mobile-banner.png`, `reference-mobile-nested-targets.png`, `reference-mobile-page-details.png`, `reference-desktop-banner.png`, `reference-desktop-private-photo.png` and `reference-desktop-history.png`.

Do not infer privacy enforcement from hidden navigation or prototype links. Verify server-side administrator authorization, Neon persistence, public/private media boundaries, real network failures and concurrent edits in the application. Use approved design components for the remaining states and resolve material design changes with the owner before implementing the affected interaction.

The owner approved a backend change from Supabase to Neon in Singapore on 2026-10-28. This changes service integration, not the approved visual design. Managed authentication alone does not grant administrator access; the server must enforce the garden's administrator allowlist.
