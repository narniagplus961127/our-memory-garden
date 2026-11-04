import type { MenuItem } from "./destinations";
import type { NavigationState } from "./navigation";

async function result(response: Response): Promise<NavigationState> {
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error ?? "Could not save the menu. Try again.");
  if (!Array.isArray(data.items) || !Number.isSafeInteger(data.version))
    throw Error(
      "Sign in again to manage navigation. Your entries are still here.",
    );
  return data;
}
export async function fetchNavigation() {
  return result(await fetch("/api/navigation", { cache: "no-store" }));
}
export async function putNavigation(items: MenuItem[], version: number) {
  return result(
    await fetch("/api/navigation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, version }),
    }),
  );
}
