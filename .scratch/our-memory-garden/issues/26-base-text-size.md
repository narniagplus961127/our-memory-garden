# 26 — Use a 14 px base text size

Status: resolved

## Request

Set root/body text to 14 px instead of 16 px and let related controls, including buttons, follow it.

## Acceptance

- Share one 14 px base token between root, body and form controls. Normal buttons/links inherit it; desktop administration links use the same size.
- Keep the heading hierarchy, explicit authored text formatting and 44 px action targets intact. Default text and placeholders respond to the shared base size.
- Check desktop/mobile layouts and production build, update design/spec notes, then commit/push and release the completed changes.

## Verification

- Nine applicable desktop/mobile layout and page-presentation checks pass; one desktop navigation case is intentionally skipped on mobile.
- Browser inspection confirms root, body, standard button and input text are 14 px, button height is 44 px, and no page-wide horizontal overflow appears on desktop or 390 px mobile.
- Prettier, whitespace checks and production build pass (compile 4.8 seconds; TypeScript 2.0 seconds). No content or schema changes.

## Answer

A shared `--body-font-size: 14px` controls root, body and form text. Standard buttons inherit it, administration links match it, and responsive placeholder labels scale to it. Heading sizes and explicit inline font choices remain independent. Current visual evidence: [categories desktop](../../../docs/evidence/ticket26/categories-desktop.png), [categories mobile](../../../docs/evidence/ticket26/categories-mobile.png), [URL desktop](../../../docs/evidence/ticket26/page-url-desktop.png), [URL mobile](../../../docs/evidence/ticket26/page-url-mobile.png).
