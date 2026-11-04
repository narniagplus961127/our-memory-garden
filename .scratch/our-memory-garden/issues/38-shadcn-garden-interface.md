# 38 — Shared shadcn/ui and Tailwind garden interface

Status: resolved

The owner explicitly requested migrating the website to shadcn/ui and Tailwind, then confirmed keeping the soft garden colours and typography while standardizing components. Migrate shared controls and dialogs without replacing page data, authentication or Puck. Use a shared modal shell and consistent icon-only Close actions across the site. Improve the floating administration shortcut: hover on desktop/tap on mobile exposes Dashboard and an authenticated Edit this page link for the current page, with keyboard/outside dismissal. Retain current botanical layout, spacing and access boundaries. Preserve tickets 36/37's refinements. Verify real desktop/mobile journeys before production release.

## Answer

Shared shadcn/ui sources now provide controls, button links, cards and Radix-based popup primitives, styled with Tailwind and the existing garden colours/fonts. Body/control text remains 14 px, and a 4 px Tailwind spacing unit preserves 44 px action targets independently of the root font size. Native selects retain mobile/keyboard behaviour and consistent arrow clearance. Existing page content and Puck layout APIs remain compatible.

The shared Modal replaces independently implemented application dialogs: photo details/picker, columns, inline links/colours, gallery, public mobile menu and confirmations use the same centred shell, icon-only close, scrolling and focus rules. Cancel is initially focused for confirmations; pending mutations cannot be dismissed; iframe focus returns correctly. Dialogs appear above toasts. Mobile editor save-error notifications move above the open inspector so they cannot cover outline rows.

The floating seedling opens Dashboard on desktop hover or mobile tap, with an authenticated current-page Edit this page link. Keyboard, Escape and outside dismissal work; anonymous/not-found pages receive no editor shortcut.

Both canvas Delete and inspector Remove now open confirmation before removing editor content. Containers disclose nested children; cancellation changes nothing and photos stay in the library. Direct Puck deletion is disabled, while its inline rich-text toolbar bridge and duplicate action are preserved. Confirming checks the block against the latest state before removal.

## Verification

The 184-case desktop/mobile browser suite completed with 174 passes, 3 intentional skips and 7 failures. Six failures came from tests expecting old non-portalled dialogs; their corrected recovery journeys all pass. The remaining failure exposed a real mobile toast overlap; the corrected flow and its geometry assertion pass. Across the full run and focused reruns, all 181 enabled journeys pass. Additional missing-photo history coverage passes for both devices in ticket 39. TypeScript, formatting/whitespace checks and the optimized production build pass. Runtime dependency audit adds no new advisories; seven existing low-severity unused Neon auth-UI dependency advisories remain.

Screenshots: [columns desktop](../../../docs/evidence/ticket38/column-modal-desktop.png), [mobile](../../../docs/evidence/ticket38/column-modal-mobile.png), [garden tools desktop](../../../docs/evidence/ticket38/garden-tools-desktop.png), [mobile](../../../docs/evidence/ticket38/garden-tools-mobile.png). Native FigCraft frames are not redrawn for this owner-approved implementation refinement. Puck-owned controls retain supported markup and garden styling; the shared application components are documented in docs/ui-system.md.
