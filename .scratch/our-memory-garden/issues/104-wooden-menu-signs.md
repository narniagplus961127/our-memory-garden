# 104 — Wooden signs in the visitor slide-in menu

Status: resolved

Show a full-screen visitor menu popup with centered original pixel wooden planks and smaller indented planks for descendants, matching the owner's revised reference. Preserve first-click expansion, second-click navigation, separate arrows, keyboard operation and reduced-motion behavior. Keep the close header visible and the long menu list independently scrollable on desktop/mobile. Keep the artwork small, decorative and independent of administrator navigation.

## Answer

Implemented a full-screen sage popup with centered original wooden plank artwork, smaller child planks, readable real text, separate arrows and reduced-motion-aware entrance. Its header does not scroll; long lists scroll independently. Existing focus trapping, Escape behavior, first-click expansion, second-click navigation and new-tab destinations remain intact. Removed the former flat green menu hover override so wood stays visible.

Two final desktop/mobile journeys pass with 14 extra menu items: the last item is reachable while the close button stays in the viewport. Full-screen dimensions, child hierarchy, keyboard dismissal, horizontal bounds and navigation are verified. Reviewed the final desktop screenshot. TypeScript, formatting and production build pass.

Known limits: the reference is interpreted through original vector artwork rather than reproducing its stock image or lettering.
