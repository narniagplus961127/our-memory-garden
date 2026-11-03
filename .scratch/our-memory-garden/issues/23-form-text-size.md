# 23 — Match input and select text to surrounding form text

Status: resolved

## Request

Reduce overall input/select typography to the size of the surrounding text.

## Acceptance

- Use the shared 14 px form-text size for inputs, selects and textareas, matching form labels. Include the editor title field, numeric toolbar input and block/page settings.
- Preserve the 44 px minimum touch targets, field spacing, native semantics and authored website typography.
- Verify the existing desktop/mobile layout checks and production build, then commit/push and release.

## Verification

- Four existing desktop/mobile layout cases pass, including equal control heights/gutters and numeric-toolbar alignment.
- Browser inspection confirms input text, select text and the associated label all use 14 px; input/select height remains 44 px.
- Prettier, whitespace checks and optimized build pass (compile 5.1 seconds; TypeScript 3.0 seconds; nine static pages generated).
- No new test files, dependencies, schema changes or content changes.

## Answer

A shared `--control-font-size: 14px` controls form inputs, selects and textareas. The editor title field and compact numeric toolbar use it too; larger legacy title-field overrides were removed. Touch targets and spacing remain intact. Authored website typography is unchanged. [Desktop evidence](../../../docs/evidence/ticket23/form-text-desktop.png).
