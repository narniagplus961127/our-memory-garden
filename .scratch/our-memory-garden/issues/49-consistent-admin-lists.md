# 49 — Align the admin lists and save their order

Status: resolved

Share row styling, drag handles, and edit and delete action placement across Pages, Categories, and Navigation. Save manual order for the Pages and Categories admin lists. Preserve public page and grid ordering, Navigation hierarchy, and existing removal confirmations.

The database stores Pages and Categories order separately and rejects stale writes. Both lists use their previous default sort until reordered, and new rows follow the saved rows. Desktop and mobile browser checks covered layout, order persistence, stale writes, Navigation mouse and touch dragging, and existing removal flows. The additive migration was rehearsed locally before release.
