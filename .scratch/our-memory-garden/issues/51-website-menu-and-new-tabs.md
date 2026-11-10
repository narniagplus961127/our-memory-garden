# 51 — Use one website drawer and configure new tabs

Status: resolved

Show the website menu as a full-height slide-in drawer at every viewport width. Add an optional Open in a new tab checkbox to each Navigation item. Existing items and new unchecked items open in the current tab. The floating Garden dashboard and Edit this page shortcuts always open in new tabs.

Desktop and mobile browser checks covered the drawer while scrolled, nested menus, reduced motion, keyboard dismissal, saving and clearing the new-tab option, real new tabs, and category links. The type check and production build passed. A rollback after the new option has been stored should retain support for the optional menu field so Navigation can still save changes.
