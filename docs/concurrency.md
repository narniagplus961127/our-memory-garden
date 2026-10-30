# Dependable page saving and recovery

Ticket 09 uses the approved running-browser and authenticated API/database testing seams. The design references are the existing saving/failure/recovery/text comparison states and contested layout frames 2684/2719 in docs/design-state-reference.md.

## Save boundary

PATCH /api/pages/[id] accepts a positive integer version and any supplied title, content or visibility, plus optional editorSessionId and reason. The editor also submits accountId; a mismatch with the server-verified administrator rejects the cached editor with 401. Origin, session, administrator allowlist and recursive block validation remain enforced. Missing editable fields mean unchanged relative to the trusted base. Slug and other metadata are never copied from an editor snapshot into the page update.

The service locks the current page with FOR UPDATE inside one postgres.js transaction. It loads the exact base for this page/version from the current row or page_versions. Client-provided base JSON is ignored. A missing base returns a recoverable 409 without a write. Page deletion/existence and homepage visibility are checked against the locked current row.

A shared bounded three-way merge separates stable block payload IDs from registered Puck slot topology (Section.content and Columns.left/right). Independent descendant edits, one-sided moves plus text and harmless index shifts merge. Title and visibility merge independently. Stale public visibility or title carried with local text is therefore unchanged intent and cannot undo a remote privacy/title update. Unsafe overlapping structures, moves into deleted parents and subtree deletion versus descendant edits require an explicit layout choice.

Success returns the latest full page row. Semantic no-ops return its current version without a new revision. A conflict returns HTTP 409 with {kind:'conflict', saved, base, local, draft, conflicts}. Each conflict has a stable key, kind (block, metadata or layout), optional blockId, label, local and saved values. No partial write occurs. The client resolves only contested payloads/topology within an independently merged draft, then submits against saved.version. Every resolution, including accepting unchanged saved text, reconciles with the server again. A later same-block edit prompts again; independent later text/privacy changes survive.

## Exact revisions and ticket 10 handoff

Apply db/migrations/0009-versions.sql after 0001 and 0002. It adds these live page fields:

- edit_group_id UUID, editor_session_id text and edit_reason text.
- page_versions has (page_id, version) primary key, snapshot JSONB containing the exact full OLD page row, updated_at, updated_by, group_id, reason and archived_at.
- page_versions.page_id references pages(id) ON DELETE CASCADE. Public role access is revoked. Ticket 09 exposes no public or unauthenticated history endpoint.
- The BEFORE UPDATE trigger archives OLD in the same transaction whenever version, title, content, visibility or deleted_at changes and advances the version by exactly one. Archive failure rolls back the update. It never ignores a duplicate archive error.

Other page metadata writers must increment version too, so their complete old row becomes a trusted immutable base. Ticket 08's slug-only update intentionally does not increment version or archive; slug is independent of the autosaved snapshot. History restoration must preserve the current live row before replacement and keep current visibility; trash restoration intentionally returns private. Ticket 10 supplies authenticated history/trash/read/restore interfaces. There is no ticket 09 history pruning or lossy coalescing.

Adjacent saves share a display group only for the same actor/editor session within 60 seconds with no intervening actor and no visibility boundary. Conflict resolutions begin a new group. Every exact version remains retained regardless of grouping. Original actor/time are stored with the displaced snapshot. No older snapshots are invented during migration.

## Browser state and device copies

The editor compares normalized content on every Puck onChange; it never discards an assumed initial callback. One debounced request runs at a time. A response reconciles submitted/current/server snapshots before applying remote merged content to mounted Puck via setData. Account and page identity key the editor; ordinary saves never remount it. Newer keystrokes stay unsaved until acknowledged, with no intermediate Saved state for older content.

Versioned device records contain account/page/editor-session IDs, trusted base version and editable base/working snapshots, sequence, timestamp, resolution reason and unresolved comparison candidates. A comparison recovered after refresh uses the latest authenticated saved page, so a client-side in-flight conflict cannot turn into an unreviewed overwrite. They contain no credentials. Records are written on every edit, including manual comparison text, before the debounce. Record size is bounded to one million characters; blocked or full storage is disclosed while in-memory retry remains available.

Same-tab refresh uses its sessionStorage editor ID and restores its localStorage record as recovered unsaved. A newly opened tab offers other same-account/page copies explicitly instead of combining unrelated drafts. Normal saving clears only this tab's acknowledged record. Explicit recovery also clears the selected source copy after acknowledgement only if that source record is unchanged; its exact receipt survives another failed save and refresh. A newer draft written in its owning tab is retained.

The application sign-out form clears this account's garden recovery keys and signals open tabs before submitting logout. Each active editor stops timers/callbacks, clears account copies and navigates to sign in on a remote sign-out or confirmed session loss. Late save callbacks cannot recreate records after the editor stops. Recovery records for another account/page are never loaded.

## Limits

Same-slot concurrent insertions or reorders may conservatively prompt even when a richer operation log could merge them. Overlapping ancestor/destination cases may ask for a whole-layout choice, preserving independently merged payloads and both structural candidates until a choice succeeds. Block payloads are atomic: different property edits on one block can require comparison. This is snapshot concurrency, without full live collaborative text editing.

Device recovery depends on available same-origin browser storage. An absent/pruned server base never authorizes blind overwriting; local work remains available to copy/compare. Exact snapshots are retained without pruning until a separately designed retention policy. Hosted Neon Auth, email delivery and production deployment verification remain ticket 13.

