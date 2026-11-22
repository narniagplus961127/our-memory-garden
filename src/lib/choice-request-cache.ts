"use client";

// Only small authenticated choice responses live here, in this browser's memory.
// The server still authorizes every request; this never caches access decisions.
const requests = new Map<
  string,
  { promise: Promise<unknown>; expires: number }
>();
export function clearChoiceRequest(path: string) {
  requests.delete(path);
}
export function loadChoiceData<T>(path: string): Promise<T> {
  const cached = requests.get(path);
  if (cached && cached.expires > Date.now())
    return cached.promise as Promise<T>;
  requests.delete(path);
  while (requests.size >= 20) requests.delete(requests.keys().next().value!);
  const entry = {
    promise: Promise.resolve<unknown>(undefined),
    expires: Infinity,
  };
  entry.promise = fetch(path, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  })
    .then(async (response) => {
      if (!response.ok) {
        if (response.status === 401 || response.status === 403)
          requests.clear();
        throw Error("Could not load choices.");
      }
      const data: unknown = await response.json();
      entry.expires = Date.now() + 30_000;
      return data;
    })
    .catch((error) => {
      if (requests.get(path) === entry) requests.delete(path);
      throw error;
    });
  requests.set(path, entry);
  return entry.promise as Promise<T>;
}
