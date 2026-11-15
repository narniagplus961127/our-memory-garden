# 59 — Tag pages with multiple categories and subcategories

Status: resolved

Create, rename and move categories on the dedicated Categories screens. A category can have an optional parent, with its own stable address. Page settings can select several existing categories and autosaves the assignments. Show parent paths in category pickers. Parent archives and category-based page grids include descendants and show each matching page once. Keep existing assignments and support recovery, backups, cloning and page visibility. Deleting a category clears only that tag and moves its immediate subcategories to its former level.

Desktop and mobile checks covered the category form, multi-select, autosave, independent concurrent tag edits, and existing details recovery. API checks covered tree cycles, ancestor listings, privacy, clone and restore, deletion, inbound grid links and backup snapshots. Migration 0020 preserved the existing production membership.
