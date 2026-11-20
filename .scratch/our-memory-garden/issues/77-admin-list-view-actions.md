# 77 — View website pages from admin lists

Status: resolved

- Add View to each page and category action menu, opening the website in a new tab. Homepage links lead to the site root and other page links use the stable page address.
- Use the shared three-dot action menu for Navigation with Edit, View, and Delete. View follows the configured page, category, system page, or external destination. Deletion still opens its confirmation dialog.
- Remove the outdated equal-access message from Account settings.

## Verification

Desktop and mobile browser checks passed for opening page/category destinations in new tabs, menu View addresses, and Navigation deletion confirmation, cancellation, failure/retry, and concurrent changes. Typecheck and changed-file formatting passed. The update uses the existing database schema.
