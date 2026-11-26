# 120 — Mobile editor flickers immediately on opening

Status: resolved

The owner reports immediate repeated flickering on opening page `941934ff-f072-4254-b2b9-ad24676f714d` at mobile widths. Reproduce its layout without changing production content, identify the repeating layout/render transition, fix the cause and verify stable opening and editing. Preserve the existing page, photos and desktop editor. Commit, push and deploy under standing authorization.

## Answer

Clarification: desktop Google Chrome with the editor's **Mobile** preview selected; only the preview flickered. The real Chrome tab uses 125% display scaling.

The auto-sized preview iframe could introduce its own vertical scrollbar. That reduced the content width from about 390 to 375 pixels. The photo grid remeasured and reflowed, changing the document height; the iframe's automatic height then removed the scrollbar and restarted the cycle. Keep vertical scrolling in the existing outer canvas by hiding the iframe viewport's vertical overflow. The frame still grows with its content. This is scoped to `EditorFrame`, including the template editor; public pages retain normal scrolling.

## Verification

- Reproduced in the owner's authenticated tab without editing content: 15 alternating height changes (11755/12150 pixels).
- Created a local copy of the same block layout using synthetic portrait/landscape photos, without copying production photo bytes or changing production content.
- A headed Chrome CLI regression loop at `--force-device-scale-factor=1.25` reproduced 19 repeated size changes in five seconds. The same loop after the source fix reported zero, on fresh opening and in desktop preview. At normal scaling the original case was already stable.
- Confirmed the bottom of the long photo grid remains reachable through the outer canvas. The editor deliberately intercepts the grid's preview button to select the block, so a preview click is not evidence of public Load more behavior; this change does not alter that behavior.
- Existing `tests/browser/editor-stability.spec.ts`: all four desktop/mobile checks passed, including typing, formatting, selection, dialogs, saving and reloading.
- Changed source passes Prettier; production build and TypeScript checks pass.

## Limitations

The fractional-scale, headed-Chrome reproducer was run as a temporary CLI check, rather than added to the standard headless suite, whose overlay scrollbars did not reproduce this bug. Temporary local fixtures and captured page data remain outside tracked source and are cleaned up after diagnosis.
