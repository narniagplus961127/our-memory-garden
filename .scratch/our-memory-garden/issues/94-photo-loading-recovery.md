# 94 — Recover failed photo loads without mislabelling deleted photos

Status: resolved

Provide a shared retry state for transient photo failures and an unavailable state only after an authorized metadata-only check reports not found. Preserve photo privacy and avoid downloading bytes to diagnose an image. No automatic retry loop. Thumbnails inside existing buttons must not gain nested interactive controls; their normal viewer/Details action provides retry. Cover the Media Library, Details and shared viewer/thumbnail rendering.

## Answer

Shared images make one bounded same-origin HEAD check after failure. Missing/access-changed photos receive unavailable copy; other failures offer connection/retry guidance. Standalone images and viewers provide an explicit Retry photo button; embedded thumbnails retain their existing action without nested buttons. HEAD uses current authorization and object metadata, with no object body or photo-byte metric. Retry does not bypass access checks.

Desktop/mobile tests cover transient failure, unavailable response, successful retry, private HEAD denial and empty HEAD bodies. Historical deletion and single-picker pagination regressions pass. A Details retry reloads its preview; a previously failed library thumbnail can be refreshed separately. No automatic retry loop, migration or new service.
