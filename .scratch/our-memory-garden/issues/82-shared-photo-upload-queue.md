# 82 — Keep photo uploads running across page navigation

Status: resolved

Audit all photo-upload entry points and replace component-owned uploads with one tab-scoped queue above page layouts. Cover Media Library, normal images, page/sharing covers, section backgrounds, Photo Grid and template pickers through the shared library. Limit concurrent upload/processing jobs to two. Provide a compact floating progress panel, an accessible shared activity dialog for use inside photo pickers, minimize, retry, remove failed files and cancel queued files. Refresh mounted library views in bounded batches as photos become ready.

Keep selected File objects in memory while working and release them on success/cancellation/removal/sign-out. Retry an uncertain processing response against the same server upload ID to avoid duplicate photos. Stop requests and discard files if the administrator account changes or signs out, including another tab's existing sign-out signal. Warn before reload/leaving with unfinished work and confirm same-tab sign-out. Preserve normal internal navigation, including plain links, while work is unfinished.

## Limits

The queue belongs to one open browser tab and is not durable across refresh, browser/OS termination or closing the tab. Browser unload warnings are not reliable on all mobile exits. Keep this tab open; resumable uploads across browser restarts are outside this ticket. Photos already processing on the server may finish after sign-out. Cancel queued files does not delete successfully uploaded photos.

## Verification

All photo upload calls now go through the root queue/transport; only the shared library contains a photo file control. JSON import remains separate. Administrator scope stays bound across admin, public and editor navigation. The floating panel minimizes on navigation, avoids admin navigation/public shortcuts, and shifts toasts above itself. Picker progress uses the shared activity dialog. The queue keeps fifty visible entries initially, two concurrent upload/processing jobs, per-file retry, cancel queued and remove-failed controls. Mounted libraries refresh at most once per two seconds and wait during an active selection.

Three queue checks passed for shared slots/cancellation, idempotent processing retry and account/session isolation. Desktop/mobile journeys passed for admin/public navigation, plain links, editor-picker handoff, unload guards, sign-out cancellation and confirmed stopping. Existing real upload/feedback, original download, photo details/reuse and paginated picker journeys passed. The responsive-image assertions now verify the actual image response ID and bitmap dimensions/aspect ratio instead of density-corrected browser naturalWidth. Seven existing media API checks passed. Typecheck and changed-file formatting passed; final release build tracked with the delivery.

The production build passed. The existing Next.js development badge can obscure the desktop sign-out button, so that test uses keyboard activation. No production behavior is bypassed. See [upload behavior](../../../docs/photo-uploads.md).
