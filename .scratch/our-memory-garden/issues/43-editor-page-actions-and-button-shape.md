# 43 — Editor page actions, button shape and animations

Status: resolved

Add a page-delete action in the editor using the shared confirmation and recoverable trash flow. Keep homepage protection, current saved revision checks, saving/error/conflict safety, and redirect to Pages after success. Remove the visible Navigation Your menu subheading and drag instructions while keeping keyboard instructions and focus recovery accessible. Add button padding and border-radius controls to configure size and roundness. Preserve existing button styles and responsive rendering, update spec/design reference, verify desktop/mobile and release.

The owner also requested animated website submenus. Collapse nested links by default, provide an explicit chevron toggle, desktop hover and keyboard support, mobile tap expansion, Escape/outside dismissal, and reduced-motion support. Preserve parent destinations, nested items and private-page filtering without increasing the closed header height.

Each block/section also needs an Animation setting, extensible beyond the initial Fade in option. Fade in is enabled by default and moves slightly from above to the original position. Provide None to disable, keep editing still and respect reduced motion.

## Answer

Page settings ends with Delete page, reusing the shared recoverable trash flow. Content/details saving and conflict states disable the action; homepage protection remains. The confirmation loads the latest saved page and inbound references, retains optimistic version checks, supports cancel/focus return and retry, and redirects to Pages after success. No permanent deletion is added to the editor.

Button style adds four independent inner padding controls (0–120 px) and corner radius (0–999 px), with blank/reset defaults. Server validation rejects unsupported shapes, invalid values and unknown animation types. Existing block spacing/corners retain their separate meaning.

Every content block and section, including legacy types, uses the reusable native-element AnimatedBlock component. Fade in defaults on even when older content lacks the property. It combines opacity and an 8 px descent over 600 ms, once per viewport entry on a new page mount; None disables it. The canvas stays stationary, reduced-motion users see stationary content, and server-rendered content remains visible without JavaScript. Future animation types extend the UI/server enum. No layout wrapper is added around existing roots or slot callbacks.

Navigation removes the visible Your menu subheading/tutorial, keeps screen-reader drag instructions and focuses Navigation after removal. Public nested links use animated chevron disclosures: desktop top-level hover, mobile tap, nested expansion, keyboard/ArrowDown, Escape and outside dismissal. Parent links still navigate. The shared Modal composes Escape handling so mobile submenus collapse before the surrounding dialog. Desktop navigation opts out of scroll anchoring; direct mouse checks retain header position and height.

## Verification and limits

Six final desktop/mobile feature journeys pass, covering saving guards, current saved revisions, stale-delete conflict, failure/retry, cancel/focus return, homepage protection, retained details after trash, button padding/radius persistence and reset, invalid values, default/disabled fade-in, actual -8 px keyframes, offscreen reveal, reduced motion, nested dropdowns and dismissal. Eight existing menu form/reordering journeys and four caret/Pages-list trash journeys pass. The desktop submenu check also passes three repeated direct mouse runs. All eight block/navigation API tests pass. Formatting, TypeScript, whitespace and optimized production build pass.

Earlier test runs exposed a fixture spacing value outside the existing 120 px limit and a wrong assumption about default button padding; both fixtures were corrected. Mobile Escape required coordinating the modal's native Escape handler with the submenu's bubbling event. Automated locator clicks could scroll a transitioning desktop dropdown; the regression uses direct pointer input and checks header position explicitly. Temporary diagnostic logging was removed.

No database migration or dependency change is required. Fade-in defaults now apply to older content as requested. Retain the new JSON-field validators in any rollback that must edit pages saved with these properties. Permanent deletion remains in Trash. The spec/UI/design references and [desktop/mobile screenshots](../../../docs/design-state-reference.md#page-actions-button-shape-and-animated-navigation-ticket-43) record this owner-requested increment; native FigCraft frames were not redrawn.
