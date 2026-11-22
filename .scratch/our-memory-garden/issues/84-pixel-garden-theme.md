# 84 — Pixel garden theme across the website and administration

Status: resolved

The owner requested a pixel garden game theme, pixel font by default, and explicitly included the admin dashboard on 2026-11-22. This direction supersedes the original Sunlit Garden appearance and serif wordmark. Keep the existing site structure, authored page content, photos, explicit text styling, accessibility, responsive layouts and functionality.

Use locally hosted Chinese/Latin pixel typography, cream and leafy-green surfaces, restrained flowers, crisp borders and a pixel twin-seedling mark. Apply shared controls and panels consistently across public pages, authentication, administration, editor chrome, pickers and dialogs. Add lightweight original decorative pixel garden artwork, without copying the supplied game's artwork or adding runtime services. Preserve image natural appearance and viewer gestures. Decorative assets must be inaccessible to assistive technology and should not intercept actions. Respect reduced motion and keep touch targets usable.

## Verification

Sixteen existing desktop/mobile checks passed for editor canvas stability, centred link dialogs/selection preservation, bulk photo deletion, built-in links, dedicated navigation forms, safe cancellation, failures/concurrency and authentication boundaries. Typecheck and changed-file formatting passed.

Reviewed public pages, dashboard, page lists, Media Library and editor at 1440, 390 and 320 px with no horizontal page overflow. Chinese/Latin pixel font loaded in the website, controls and editor iframe; explicit authored Georgia text remained intact. Reviewed the slide-in menu after its animation, photo-details dialog and login screen. Fixed the global inherited anchor colour overriding primary link-button contrast. Primary text/surface combinations measured 9.75:1, muted text 6.18:1, sidebar text 7.98:1 and footer text 8.61:1. All checks used an isolated local database/storage; production content was not modified.

The local development screenshot harness needed to wait for fonts instead of network-idle during preview reloads, and use labelled Photo details buttons. This affected inspection tooling, not application behavior. The production build passed. Delivery follows the linked branch and pull request.

## Limitations

Existing explicit fonts/colours/radii in authored content are preserved, so those choices can intentionally differ from the theme. The single cached font adds 695 KB on first load; the reused original SVG scene is 8 KB. No new animation library, service, database migration or continuous background animation was introduced. The existing Next.js security follow-up remains tracked separately in ticket 81.
