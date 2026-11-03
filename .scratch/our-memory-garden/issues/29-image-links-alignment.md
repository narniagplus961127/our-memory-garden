# 29 — Image destinations and right alignment

Status: resolved

Add an optional garden-page/external destination to the Image block's editor settings. Links wrap only the image/placeholder on the saved website; caption editing, photo selection and dragging remain usable in the editor. Preserve stable page IDs, safe URL validation, inbound-reference warnings and private-page not-found behaviour. Add Right to block and inline-paragraph alignment with server validation. Verify save/reload/render/remove and update documentation before pushing.

## Verification

Four desktop/mobile browser checks pass: external and stable-ID image links, editor photo controls, removal, unsafe URL rejection, inbound references, private target 404, and block/inline right alignment after reload and public rendering. A stale local server render was refreshed during verification; no product workaround was needed. Final production build and release verification cover this ticket with ticket 30.
