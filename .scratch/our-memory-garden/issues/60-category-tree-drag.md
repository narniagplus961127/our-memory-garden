# 60 — Drag category branches and compact the page category picker

Status: resolved

Reuse Navigation’s drag behavior and nested row layout for Categories. Dropping on a row nests the category. Dropping at its edge places the category alongside it. Moving a branch keeps its children attached. Save the parent and the order atomically and reject cycles or stale moves.

Keep the editor picker aligned at every selection count. Show the full path in the choices and a count in the closed picker when multiple categories are selected. Use a subtle keyboard focus highlight on the row and a compact checkbox.

Desktop and mobile checks covered nesting and outdenting with a branch, persistence, rejection of cycles, page tag autosave, checkbox focus styling, and field alignment. The existing order and category tables support the change without a migration.
