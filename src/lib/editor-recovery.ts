import { validPageData } from "./blocks";
import type { GardenPage } from "./pages";
import type { PageSnapshot } from "./page-merge";
export const recoveryPrefix = (accountId: string) =>
  "garden-recovery:" + encodeURIComponent(accountId) + ":";
export const logoutSignal = "garden-signout";
export type RecoveryRecord = {
  schemaVersion: 1;
  accountId: string;
  pageId: string;
  editorSessionId: string;
  baseVersion: number;
  baseSnapshot: PageSnapshot;
  workingSnapshot: PageSnapshot;
  editSeq: number;
  savedAt: string;
  reason?: "edit" | "resolution";
  source?: { key: string; value: string | null };
  comparison?: { baseSnapshot: PageSnapshot; saved: GardenPage };
};
function validSnapshot(value: unknown): value is PageSnapshot {
  if (!value || typeof value !== "object") return false;
  const s = value as PageSnapshot;
  return (
    typeof s.title === "string" &&
    s.title.length <= 200 &&
    ["private", "public"].includes(s.visibility) &&
    validPageData(s.content)
  );
}
export function parseRecovery(
  value: string | null,
  accountId: string,
  pageId: string,
): RecoveryRecord | null {
  try {
    if (!value || value.length > 1000000) return null;
    const r = JSON.parse(value);
    return r.schemaVersion === 1 &&
      r.accountId === accountId &&
      r.pageId === pageId &&
      typeof r.editorSessionId === "string" &&
      /^[\w-]{1,120}$/.test(r.editorSessionId) &&
      Number.isSafeInteger(r.baseVersion) &&
      r.baseVersion > 0 &&
      Number.isSafeInteger(r.editSeq) &&
      validSnapshot(r.baseSnapshot) &&
      validSnapshot(r.workingSnapshot) &&
      (!r.source ||
        (typeof r.source.key === "string" &&
          r.source.key.startsWith(recoveryPrefix(accountId) + pageId + ":") &&
          (r.source.value === null || typeof r.source.value === "string"))) &&
      (!r.comparison ||
        (validSnapshot(r.comparison.baseSnapshot) &&
          validSnapshot(r.comparison.saved) &&
          r.comparison.saved.id === pageId &&
          Number.isSafeInteger(r.comparison.saved.version) &&
          r.comparison.saved.version > 0))
      ? r
      : null;
  } catch {
    return null;
  }
}
export function clearAccountRecovery(accountId: string) {
  try {
    for (const key of Object.keys(localStorage))
      if (key.startsWith(recoveryPrefix(accountId)))
        localStorage.removeItem(key);
  } catch {
    /* In-memory edits are stopped even when device storage is unavailable. */
  }
}
export function signOutEditors(accountId: string) {
  clearAccountRecovery(accountId);
  window.dispatchEvent(new CustomEvent(logoutSignal, { detail: accountId }));
  try {
    localStorage.setItem(
      logoutSignal,
      JSON.stringify({ accountId, nonce: crypto.randomUUID() }),
    );
  } catch {}
}
