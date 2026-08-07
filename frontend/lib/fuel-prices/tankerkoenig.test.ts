import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FuelPriceError,
  clampRadiusKm,
  clearStationCache,
  isFuelPriceLookupConfigured,
  listStationsNearby,
} from "@/lib/fuel-prices/tankerkoenig";

const SEARCH = { lat: 50.9413, lng: 6.9583, radiusKm: 5 };

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function station(overrides: Record<string, unknown> = {}) {
  return {
    id: "abc-1",
    name: "Aral Köln",
    brand: "ARAL",
    street: "Hauptstraße",
    houseNumber: "12",
    postCode: 50667,
    place: "Köln",
    lat: 50.94,
    lng: 6.95,
    dist: 1.2,
    isOpen: true,
    e5: 1.899,
    e10: 1.839,
    diesel: 1.759,
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearStationCache();
  process.env.TANKERKOENIG_API_KEY = "test-key";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TANKERKOENIG_API_KEY;
  clearStationCache();
});

describe("configuration", () => {
  it("is off without a key", () => {
    delete process.env.TANKERKOENIG_API_KEY;
    expect(isFuelPriceLookupConfigured()).toBe(false);
  });

  it("treats a blank key as no key", () => {
    process.env.TANKERKOENIG_API_KEY = "   ";
    expect(isFuelPriceLookupConfigured()).toBe(false);
  });

  it("refuses to call upstream without a key", async () => {
    delete process.env.TANKERKOENIG_API_KEY;
    await expect(listStationsNearby(SEARCH)).rejects.toMatchObject({
      reason: "not-configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("clampRadiusKm", () => {
  it("never exceeds the 25 km the API allows", () => {
    expect(clampRadiusKm(100)).toBe(25);
    expect(clampRadiusKm(0)).toBe(1);
    expect(clampRadiusKm(12)).toBe(12);
  });
});

describe("listStationsNearby", () => {
  it("requests every grade in one call and sends the key", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, stations: [station()] }));

    await listStationsNearby(SEARCH);

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.searchParams.get("type")).toBe("all");
    expect(url.searchParams.get("apikey")).toBe("test-key");
    expect(url.searchParams.get("rad")).toBe("5");
    expect(Number(url.searchParams.get("lat"))).toBeCloseTo(50.9413, 4);
  });

  it("normalises a station", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, stations: [station()] }));

    const result = await listStationsNearby(SEARCH);
    const [entry] = result.stations;

    expect(entry.id).toBe("abc-1");
    expect(entry.brand).toBe("ARAL");
    // A numeric postcode from upstream still has to come out as a string.
    expect(entry.postCode).toBe("50667");
    expect(entry.distanceKm).toBe(1.2);
    expect(entry.isOpen).toBe(true);
    expect(entry.prices).toEqual({ e5: 1.899, e10: 1.839, diesel: 1.759 });
  });

  it("turns a missing price into null rather than a free tank", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: true,
        // Upstream sends `false` for a grade the station does not sell.
        stations: [station({ e5: false, e10: 0, diesel: "1.759" })],
      }),
    );

    const [entry] = (await listStationsNearby(SEARCH)).stations;
    expect(entry.prices.e5).toBeNull();
    expect(entry.prices.e10).toBeNull();
    // A numeric string is still a real price.
    expect(entry.prices.diesel).toBe(1.759);
  });

  it("treats anything but isOpen === true as closed", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, stations: [station({ isOpen: "yes" })] }),
    );
    expect((await listStationsNearby(SEARCH)).stations[0].isOpen).toBe(false);
  });

  it("drops rows that cannot be placed on a map", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: true,
        stations: [
          station(),
          station({ id: "no-coords", lat: undefined, lng: undefined }),
          station({ id: undefined }),
          "garbage",
        ],
      }),
    );

    const result = await listStationsNearby(SEARCH);
    expect(result.stations.map((entry) => entry.id)).toEqual(["abc-1"]);
  });

  it("survives a response without a stations array", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await expect(listStationsNearby(SEARCH)).resolves.toMatchObject({
      stations: [],
    });
  });
});

describe("error mapping", () => {
  it("recognises a rejected API key from the message", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: false, message: "apikey nicht korrekt" }),
    );

    await expect(listStationsNearby(SEARCH)).rejects.toMatchObject({
      reason: "invalid-key",
    });
  });

  it("maps any other ok:false to a generic upstream failure", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: false, message: "service unavailable" }),
    );

    await expect(listStationsNearby(SEARCH)).rejects.toMatchObject({
      reason: "upstream",
    });
  });

  it("maps HTTP 429 to a rate limit", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 429));
    await expect(listStationsNearby(SEARCH)).rejects.toMatchObject({
      reason: "rate-limited",
    });
  });

  it("maps a timeout to its own reason", async () => {
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    fetchMock.mockRejectedValue(timeout);

    await expect(listStationsNearby(SEARCH)).rejects.toMatchObject({
      reason: "timeout",
    });
  });

  it("maps a network failure to upstream", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const error = await listStationsNearby(SEARCH).catch((e) => e);
    expect(error).toBeInstanceOf(FuelPriceError);
    expect(error.reason).toBe("upstream");
  });
});

describe("caching", () => {
  it("answers a repeated search from cache instead of calling upstream again", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, stations: [station()] }));

    const first = await listStationsNearby(SEARCH);
    const second = await listStationsNearby(SEARCH);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    // The timestamp must stay that of the real fetch, not of the cache hit.
    expect(second.fetchedAt).toBe(first.fetchedAt);
  });

  it("shares a cache entry between callers a few metres apart", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, stations: [station()] }));

    await listStationsNearby(SEARCH);
    await listStationsNearby({ ...SEARCH, lat: SEARCH.lat + 0.0001 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats a different radius as a different search", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, stations: [station()] }));

    await listStationsNearby(SEARCH);
    await listStationsNearby({ ...SEARCH, radiusKm: 20 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("collapses simultaneous identical searches into one upstream call", async () => {
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve(jsonResponse({ ok: true, stations: [station()] })),
            10,
          ),
        ),
    );

    const [a, b] = await Promise.all([
      listStationsNearby(SEARCH),
      listStationsNearby(SEARCH),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a.stations).toHaveLength(1);
    expect(b.stations).toHaveLength(1);
  });

  it("does not cache a failure", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));
    await expect(listStationsNearby(SEARCH)).rejects.toBeInstanceOf(
      FuelPriceError,
    );

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ok: true, stations: [station()] }),
    );
    await expect(listStationsNearby(SEARCH)).resolves.toMatchObject({
      cached: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
