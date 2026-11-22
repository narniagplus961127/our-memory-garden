# 86 — Remove decorative garden scenes and unify menu feedback

Status: resolved

The owner no longer wants the decorative landscapes added in tickets 84–85. Remove them from the footer, website menu, dashboard and page-card placeholders, including their layout reservations, shipped WebP/SVG assets and asset-specific cache configuration. Keep the pixel font, seedling brand, palette, block styling, photo-popup fix, hover effects and user photos/content. Archive the prompts as historical documentation only.

Use the same accent fill and inset pixel outline for website menu links, dashboard navigation and related menu actions, with matching focus feedback. Keep current-page styling distinct and avoid movement/layout shifts or sticky mobile hover.

## Verification

Removed all scene markup, CSS backgrounds/reserved space, three WebP exports, the original scene SVG/generator and scene-specific cache headers. Source search confirms no scene references remain in application code/configuration. Prompts are explicitly archived, not served as artwork.

Reviewed the dashboard at 1440 px and phone layout at 390 px without horizontal overflow. Welcome copy uses the available width, mobile bottom padding is 24 px, the footer is a compact 70 px text strip, and the menu navigation occupies its full 767 px available area without an image. Browser comparison confirmed both public and dashboard menu hover states use background rgb(226,237,199), a 2 px inset rgb(111,134,81) outline and no underline; the selected dashboard page retains its distinct cream background. Shared keyboard-focus styles use the same highlight. Hover remains fine-pointer-only and transitions respect reduced motion.

Typecheck, changed-file formatting, diff checks and the production build passed. The existing local Turbopack preview refresh loop interfered with inspection; the supported webpack preview was used for stable visual checks without changing production configuration. All checks used local fixtures. No data migration or production content mutation is involved. Bottom sidebar actions also use full-width targets and matching horizontal padding for consistent highlights.
