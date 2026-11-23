# 93 — Simplify admin navigation and expand content/selection actions

Status: resolved

The owner requested: remove View website and Account from the admin sidebar, place Sign out directly below Settings, and open the frontend in a new tab from the admin logo. Add a Use template content tab to the page content import popup, retaining content-only replacement, review/confirmation and History. Add View history to page-list actions. Extend Media Library selection with Shift ranges, Ctrl/Command toggling and select-loaded keyboard shortcuts, preserving pagination, deletion protection and confirmation. Keep mobile layout usable and test against isolated services.

Follow-up: photos must be selectable immediately without entering selection mode. Show selected count and actions in a floating bar that remains available while scrolling and disappears when selection is empty. Keep single-photo and Photo Grid pickers' existing behaviour.

## Answer

Removed the sidebar's View website/Account footer; Sign out follows Settings and both desktop/mobile admin logos open the frontend in a protected new tab. Account management remains reachable through Settings. Page-list menus now include View history. Pending search/sort results temporarily disable row actions and queued searches are cancelled when choosing a destination, avoiding a reproduced search-versus-history navigation race.

Added authenticated template summaries and a third import tab. Template content uses fresh block IDs and photo placeholders, goes through the existing reference checks/confirmation/transaction/History path, and preserves all destination page settings. Ambiguous sources are rejected; a deleted template cannot be applied. Confirmation reads the latest saved template, matching cross-page import behaviour.

Media Library thumbnail clicks and checkboxes select immediately. Shift extends a range in the loaded display order, Ctrl/Command toggles, Space toggles a focused checkbox, and Ctrl/Command+A adds only loaded photos while the grid has focus. Selection persists across filters; the range anchor resets when search/filters change. The fixed responsive action bar shows count, Select loaded, Clear and Delete; protected photos are kept and deletion still requires confirmation. Thumbnail dimensions remain stable. Picker flows are unchanged.

Validation: all four real desktop/mobile browser journeys pass, including imports, sidebar/menu links, history navigation, shortcut combinations, floating-bar viewport bounds, real loaded thumbnails, protected-photo preservation and failed-delete retry. Service tests pass for template authorization/content-only replacement/History/source validation/deletion-before-confirmation and the existing JSON/cross-page import regression. TypeScript, production webpack build, formatting and diff checks pass. Reviewed desktop/mobile screenshots. A disposable local PostgreSQL fixture was given more test connections after its original 20-client limit caused thumbnail failures; hosted database settings were not changed. No schema migration or new service is required.

Known limits: range/select-loaded actions apply only to loaded photos; selection is held in the current library view and is cleared on navigation/reload. Large template lists currently use lightweight summaries without search. Release details are recorded in the delivery PR.
