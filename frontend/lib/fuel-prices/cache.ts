/**
 * Tiny in-memory TTL cache with in-flight de-duplication.
 *
 * Both upstream services used by the fuel price finder ask callers not to
 * hammer them: Tankerkönig allows roughly one request a minute, Nominatim one
 * a second. A self-hosted instance with a handful of household members can
 * blow through that just by everyone pulling to refresh, so every upstream
 * call goes through here.
 *
 * In-flight de-duplication matters as much as the TTL: two people hitting
 * refresh at the same second produce one upstream request, not two.
 *
 * Deliberately process-local. Smart Garage is a single container, so there is
 * nothing to share the cache with, and a restart simply refetches.
 */

type Entry<T> = {
  value: T;
  expiresAt: number;
};

export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly inFlight = new Map<string, Promise<T>>();

  constructor(
    private readonly ttlMs: number,
    /** Guards against a pathological key space (many distinct locations). */
    private readonly maxEntries = 200,
  ) {}

  /**
   * Reports the hit separately from the value, because `null` is a perfectly
   * good thing to cache: "this coordinate has no readable place name" is an
   * answer worth remembering, and collapsing it into the miss signal would
   * re-ask the upstream service every single time.
   */
  peek(key: string): { hit: boolean; value: T | undefined } {
    const entry = this.entries.get(key);
    if (!entry) return { hit: false, value: undefined };
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return { hit: false, value: undefined };
    }
    return { hit: true, value: entry.value };
  }

  /**
   * Returns the cached value, the result of an identical request already in
   * flight, or the result of `load()` — in that order.
   */
  async resolve(
    key: string,
    load: () => Promise<T>,
  ): Promise<{ value: T; cached: boolean }> {
    const cached = this.peek(key);
    if (cached.hit) return { value: cached.value as T, cached: true };

    const pending = this.inFlight.get(key);
    if (pending) return { value: await pending, cached: true };

    const promise = load()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return { value: await promise, cached: false };
  }

  set(key: string, value: T): void {
    if (this.entries.size >= this.maxEntries) {
      // Cheapest possible eviction: drop the oldest insertion. Map preserves
      // insertion order, and a stale entry costs nothing to refetch.
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.entries.clear();
    this.inFlight.clear();
  }
}
