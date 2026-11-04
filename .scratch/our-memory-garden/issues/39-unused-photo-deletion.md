# 39 — Delete photos removed from saved pages

Status: resolved

The owner wants a photo removed from saved editor content to become deletable without deleting its page. Historical snapshots alone must no longer count as active usage or block deletion. Preserve current references, including nested blocks, section backgrounds, covers/sharing covers, trash and other pages, plus backup reservations and race-safe locking. Deletion remains explicit/permanent. Explain the history consequence, refresh photo details on opening, and show an unavailable placeholder for deleted historical images. A restore needing deleted bytes must fail without changing the current page. Verify real local storage/database behavior before applying the compatible migration and releasing.

## Answer

Photo details/list usage and both application/database deletion guards now count saved current references rather than history-only references. Removing an image from saved editor content makes it deletable when no current page, cover or sharing cover—including trash—still uses it. Details are fetched afresh on opening. Active backup reservations and attachment/deletion row locks remain in force; failed storage cleanup keeps a retryable tombstone.

Explicit deletion warns that saved page versions also lose access to the deleted photo bytes. The page and exact historical snapshots remain. Historical images, galleries and covers use an unavailable placeholder, including when an image fails before hydration. Restoration needing deleted bytes returns a conflict and preserves the current page atomically. No automatic file deletion is introduced.

## Verification

Four focused real PostgreSQL/S3 service checks pass: referenced/concurrently attached media protection, partial deletion/retry, history-only deletion with file 404 and safe restore conflict, and successful history restoration while bytes remain/current trash protection. Desktop/mobile browser journeys upload a synthetic image, attach and remove it through the editor's confirmation, wait for autosave, see usage become zero, delete it from Photo details, and verify that the page/history remain and deleted historical images show a placeholder. Existing upload/reuse/privacy/focus-return checks pass in the full browser run. Build and type/format checks pass.

Migration 0013-current-photo-retention.sql was tested on the isolated local database and applied to the verified Our Memory Garden production database in Singapore. It changes only the reference-protection function and does not delete any existing photo or page. The new policy deliberately supersedes historical-byte retention; permanently deleted photos cannot be recovered by restoring a page version. Download an independent backup first if those bytes should be retained.

Screenshots: [unused photo desktop](../../../docs/evidence/ticket39/unused-photo-modal-desktop.png), [mobile](../../../docs/evidence/ticket39/unused-photo-modal-mobile.png), [historical placeholder desktop](../../../docs/evidence/ticket39/deleted-historical-photo-desktop.png), [mobile](../../../docs/evidence/ticket39/deleted-historical-photo-mobile.png).
