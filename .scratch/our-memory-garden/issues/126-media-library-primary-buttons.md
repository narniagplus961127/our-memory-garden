# 126 — Primary Media Library controls

Status: resolved

Use the existing primary button variant for the screenshot's Refresh library, Filters and photo Details buttons. Preserve sizes, labels, disabled state, filter expansion and actions. Apply through the shared media component so editor pickers remain consistent. Verify and deploy under standing authorization.

## Answer

Changed only the three requested variant props to `primary`, removing the legacy secondary class from Refresh and Details. All use the existing forest/white primary treatment, including hover and pressed states. The shared Media Library component applies the change in the dashboard and photo-picker dialogs.

## Verification

Reviewed the focused diff: labels, dimensions, event handlers, loading disablement and filter accessibility attributes are retained. Prettier, production build and TypeScript checks pass. This reuses the primary style verified in ticket 125; no new behavior or data change.
