# 83 — Select and delete multiple library photos

Status: resolved

Add management-only multi-select to Media Library, selection across loaded batches/filters, Select loaded photos, Clear selection and Done controls. Confirm permanent bulk deletion in the shared modal. Keep photos known to be used by pages/covers selected and protected; existing per-photo server checks remain authoritative if references change. Delete with at most two concurrent requests, remove successful photos from the selection, and retain failed photos with clear per-file reasons and retry. Do not add delete controls to editor photo pickers.

## Verification

Media Library has an explicit selection mode with per-photo checkboxes, loaded-photo selection, retained selections across filters, used-photo counts and a shared confirmation dialog listing deletion candidates. Pickers do not expose these controls. Deletion uses the existing protected API with two concurrent requests, skips known used photos, removes successes from selection, retains failures with per-file reasons, and supports retry without resending successful deletes. An already-missing photo is treated as finished after an uncertain deletion. Loaded metadata updates selected usage counts after refresh.

Desktop and mobile checks passed for three selected photos (one used, two unused), filter changes, confirmation cancellation with no requests, partial failure, retry, unchanged protected photo, selected remaining protected photo and disabled delete when no eligible photos remain. Each successful first-attempt photo is requested once and the failed photo exactly twice. Seven existing media API checks verify current use/access protections. Screenshots reviewed; no new API or migration is needed.
