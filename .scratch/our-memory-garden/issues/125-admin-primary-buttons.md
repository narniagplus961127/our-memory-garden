# 125 — Consistent forest primary buttons in administration

Status: resolved

Match administrator primary actions to the forest/white controls from ticket 124. Standardize normal, hover and pressed styling, and mark remaining primary save actions explicitly. Preserve secondary actions and disabled states. Verify and deploy under standing authorization.

## Answer

Scoped the shared primary treatment to dashboard/editor controls and modal actions: forest background/border, white text, pixel shadow, a deeper forest hover and a shadow-free pressed state. Marked usage-warning saves, media metadata saves, photo-grid detail saves, original-photo download and the account reset-password link as primary actions. Existing Create/Add/Update controls use the same styling. Secondary actions keep their existing variants.

## Verification

- Browser checks on the local category form measured forest/white normal colours, a forest border, pixel shadow, darker hover and no shadow while pressed. Empty-form disabled behavior remained intact.
- Confirmed Cancel remains outlined with a cream background, Save warning levels now uses the primary variant, and the account reset link uses the same variant.
- Reviewed the 390px category form: no horizontal overflow. No form changes were submitted.
- Formatting and production build/TypeScript checks pass. Changes are presentational; data and action handlers are unchanged.
