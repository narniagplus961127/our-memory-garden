# 58 — Clone pages, categories and templates

Status: resolved

Pages, Categories and Templates share a drag grip and a three-dot row action menu for Edit, Clone and removal. Use the same three-dot icon for Page actions in the editor. After confirming a clone, open the copy for editing. A cloned page starts private with a separate URL, saved layout and settings, and independent Photo grids that use the shared Media Library. A cloned category has its own name and URL and starts empty. A cloned template is independently editable. Save manual template order and use it in the new-page template picker.

Desktop and mobile checks covered all three clone menus, cancellation, saved keyboard reordering, and the template picker. The Pages trash flow was checked for link review, concurrent changes and focus restoration. API checks covered repeat requests, unique clone URLs, private clones of public pages, and independence of a 103-photo grid. Apply 0019-template-list-order.sql before deploying.
