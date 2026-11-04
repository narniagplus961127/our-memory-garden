# 37 — Editor construction controls

Status: resolved

Allow repeated block insertion without automatically selecting the new block or closing the Add panel, for click/touch and palette dragging. Preserve insertion order/target and manual editing selection. Add Section width choices: Normal container (existing/default) and Full width without horizontal section padding/default block gutters, respecting explicit child spacing and retaining saved values when toggled. Separate Change column layout from the following divider and correct contrast of selected column-layout options. Validate nested editing, autosave, rendering and desktop/mobile behavior; update references and push.

## Answer

Inserted blocks remain unselected and the Add panel stays open. An insertion cursor keeps successive blocks in order at the intended location; newly added sections/columns become the next container target. Manual canvas/outline selection still opens editing. Puck insertion notifications cover both palette dragging and Add buttons without patching the dependency.

Section Styles now has Normal container/Full width controls. Omitted width preserves the existing normal layout. Full width removes horizontal section padding and inherited default gutters while keeping explicit child spacing; toggling back retains stored padding values. Validation accepts only the two supported modes. Change column layout has a 24 px gap before the next group, and selected column options explicitly use dark garden ink on pale green.

## Verification

Focused desktop/mobile construction journeys pass: repeated Text/Image/Button insertion without selection or panel dismissal, saved order, manual Section selection, full-width persistence/reload/toggle, selected column-option contrast and layout-action spacing. Existing nested caret/style journeys and desktop native dragging also pass; native mobile dragging is an existing skipped case covered by touch Add/Move alternatives. A first test exposed Puck radio-label interception; the width choices now use the existing accessible segmented-button pattern. Shared test helpers explicitly select blocks when a test intends to edit. No dependencies or schema changes are required by this ticket.
