// Stores immutable optimized bytes only. Authorization must run before each read.
// Per-process bounds deliberately avoid relying on this cache for availability.
export class PhotoByteCache {
  private entries = new Map<string, { bytes: Uint8Array; expires: number }>();
  private bytes = 0;
  private readonly maxBytes: number;
  readonly maxEntryBytes: number;
  private readonly lifetime: number;
  private readonly now: () => number;

  constructor(
    maxBytes = 32 * 1024 * 1024,
    maxEntryBytes = 1024 * 1024,
    lifetime = 5 * 60_000,
    now: () => number = Date.now,
  ) {
    this.maxBytes = maxBytes;
    this.maxEntryBytes = maxEntryBytes;
    this.lifetime = lifetime;
    this.now = now;
  }

  get(key: string): Uint8Array | undefined {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.remove(key);
    if (entry.expires <= this.now()) return;
    this.entries.set(key, entry);
    this.bytes += entry.bytes.byteLength;
    return entry.bytes;
  }

  put(key: string, bytes: Uint8Array) {
    this.remove(key);
    if (!bytes.byteLength || bytes.byteLength > this.maxEntryBytes) return;
    for (const [oldKey, entry] of this.entries) {
      if (entry.expires <= this.now()) this.remove(oldKey);
    }
    while (
      this.entries.size &&
      (this.bytes + bytes.byteLength > this.maxBytes ||
        this.entries.size >= 256)
    )
      this.remove(this.entries.keys().next().value!);
    if (bytes.byteLength > this.maxBytes) return;
    this.entries.set(key, { bytes, expires: this.now() + this.lifetime });
    this.bytes += bytes.byteLength;
  }

  private remove(key: string) {
    const entry = this.entries.get(key);
    if (entry) this.bytes -= entry.bytes.byteLength;
    this.entries.delete(key);
  }
}
