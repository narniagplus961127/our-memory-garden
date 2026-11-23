# 96 — Restore Media Library browsing preferences and position

Status: resolved

Remember search, filters, grouping, filter-panel state, loaded batches and scroll position when returning to the dedicated Media Library. Keep only bounded, validated preferences in account-scoped tab storage; no photo bytes or selection persistence. Clear on sign-out, tolerate unavailable storage, and leave editor pickers unchanged. Restore pagination progressively with a bound and stop on error/end/user input.

## Answer

Dedicated Media Library preferences use account-scoped session storage with a 12-hour lifetime, validated fields and a 50-batch maximum. Returning reloads authorized metadata sequentially to the saved batch count and restores scroll. Query/filter changes, refresh and wheel/touch interaction cancel restoration. Sign-out clears the entry and prevents unmount from recreating it. No photos or selections are persisted; editor pickers remain independent.

Desktop/mobile browser journeys verify three real API-backed batches, query/grouping/filter-panel/scroll restoration, no selection restoration, logout clearing and denied-storage fallback. Record validation tests cover malformed, expired, incomplete and oversized data. Restoration can stop earlier when current results shrink or requests fail; it is local to a browser tab.
