"use client";
import { useMemo, useState } from "react";
import type { AdminList, AdminListOrder } from "@/lib/admin-list-order";
import { useListReorder } from "./use-list-reorder";

const emptyOrder: AdminListOrder = { ids: [], version: 1 };

export function useAdminListOrder<T extends { id: string }>(
  list: AdminList,
  items: T[],
  label: (item: T) => string,
  initial?: AdminListOrder,
  locked = false,
) {
  const [saved, setSaved] = useState(initial ?? emptyOrder);
  const [pending, setPending] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const ids = pending ?? saved.ids;
  const ordered = useMemo(() => {
    if (!ids.length) return items;
    const rank = new Map(ids.map((id, index) => [id, index]));
    return [...items].sort(
      (a, b) => (rank.get(a.id) ?? ids.length) - (rank.get(b.id) ?? ids.length),
    );
  }, [items, ids]);
  const rows = useMemo(
    () => ordered.map((item) => ({ id: item.id, label: label(item) })),
    [ordered, label],
  );
  const busy = pending !== null;
  const sort = useListReorder(
    rows,
    busy || conflict || locked || !initial || rows.length < 2,
    (next) => void save(next.map((item) => item.id)),
  );

  async function save(next: string[]) {
    setPending(next);
    setError("");
    try {
      const response = await fetch("/api/admin-list-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list, ids: next, version: saved.version }),
      });
      const result = await response.json();
      if (!response.ok) {
        setConflict(response.status === 409);
        throw new Error(result.error);
      }
      setSaved(result);
    } catch (failure) {
      setError(
        failure instanceof Error && !(failure instanceof TypeError)
          ? failure.message
          : "Could not save this order. Try dragging again.",
      );
    } finally {
      setPending(null);
    }
  }

  return { ...sort, ordered, busy, error, conflict };
}
