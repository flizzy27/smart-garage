import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "@/lib/fuel-prices/cache";

describe("TtlCache", () => {
  it("serves a stored value and reports it as a hit", async () => {
    const cache = new TtlCache<string>(1000);
    const load = vi.fn().mockResolvedValue("value");

    const first = await cache.resolve("k", load);
    const second = await cache.resolve("k", load);

    expect(first).toEqual({ value: "value", cached: false });
    expect(second).toEqual({ value: "value", cached: true });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("caches null instead of treating it as a miss", async () => {
    // The reverse geocoder legitimately answers "no readable name here", and
    // that answer has to be remembered or every visit re-asks Nominatim.
    const cache = new TtlCache<string | null>(1000);
    const load = vi.fn().mockResolvedValue(null);

    const first = await cache.resolve("k", load);
    const second = await cache.resolve("k", load);

    expect(first).toEqual({ value: null, cached: false });
    expect(second).toEqual({ value: null, cached: true });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("distinguishes a miss from a cached null via peek", () => {
    const cache = new TtlCache<string | null>(1000);
    expect(cache.peek("nothing")).toEqual({ hit: false, value: undefined });

    cache.set("stored", null);
    expect(cache.peek("stored")).toEqual({ hit: true, value: null });
  });

  it("expires an entry once its TTL passes", async () => {
    vi.useFakeTimers();
    try {
      const cache = new TtlCache<string>(1000);
      const load = vi.fn().mockResolvedValue("value");

      await cache.resolve("k", load);
      vi.advanceTimersByTime(1001);
      await cache.resolve("k", load);

      expect(load).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("collapses concurrent identical loads into one call", async () => {
    const cache = new TtlCache<string>(1000);
    let resolveLoad: (value: string) => void = () => {};
    const load = vi.fn(
      () => new Promise<string>((resolve) => (resolveLoad = resolve)),
    );

    const both = Promise.all([
      cache.resolve("k", load),
      cache.resolve("k", load),
    ]);
    resolveLoad("value");

    const [a, b] = await both;
    expect(load).toHaveBeenCalledTimes(1);
    expect(a.value).toBe("value");
    expect(b.value).toBe("value");
  });

  it("does not remember a failed load", async () => {
    const cache = new TtlCache<string>(1000);
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("value");

    await expect(cache.resolve("k", load)).rejects.toThrow("boom");
    await expect(cache.resolve("k", load)).resolves.toEqual({
      value: "value",
      cached: false,
    });
  });

  it("evicts the oldest entry once it is full", () => {
    const cache = new TtlCache<string>(1000, 2);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");

    expect(cache.peek("a").hit).toBe(false);
    expect(cache.peek("b").hit).toBe(true);
    expect(cache.peek("c").hit).toBe(true);
  });

  it("forgets everything on clear", () => {
    const cache = new TtlCache<string>(1000);
    cache.set("a", "1");
    cache.clear();
    expect(cache.peek("a").hit).toBe(false);
  });
});
