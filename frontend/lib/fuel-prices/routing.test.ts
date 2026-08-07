import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRouteCache,
  routeBetween,
  straightLineKm,
} from "@/lib/fuel-prices/routing";

const COLOGNE = { lat: 50.9413, lng: 6.9583 };
const DUSSELDORF = { lat: 51.2277, lng: 6.7735 };

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearRouteCache();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearRouteCache();
});

describe("straightLineKm", () => {
  it("measures a known distance", () => {
    // Cologne to Düsseldorf is roughly 34 km as the crow flies.
    expect(straightLineKm(COLOGNE, DUSSELDORF)).toBeCloseTo(34, 0);
  });

  it("is zero for the same point and symmetric between two", () => {
    expect(straightLineKm(COLOGNE, COLOGNE)).toBeCloseTo(0, 6);
    expect(straightLineKm(COLOGNE, DUSSELDORF)).toBeCloseTo(
      straightLineKm(DUSSELDORF, COLOGNE),
      6,
    );
  });
});

describe("routeBetween", () => {
  it("returns the road distance and duration", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        code: "Ok",
        routes: [{ distance: 42_500, duration: 2_400 }],
      }),
    );

    const result = await routeBetween(COLOGNE, DUSSELDORF);

    expect(result.kind).toBe("road");
    expect(result.distanceKm).toBeCloseTo(42.5, 5);
    expect(result.durationMinutes).toBeCloseTo(40, 5);
  });

  it("sends longitude before latitude, as OSRM expects", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ code: "Ok", routes: [{ distance: 1000, duration: 60 }] }),
    );

    await routeBetween(COLOGNE, DUSSELDORF);

    const url = String(fetchMock.mock.calls[0][0]);
    // Swapping these silently routes between two other places entirely.
    expect(url).toContain(`${COLOGNE.lng},${COLOGNE.lat};`);
    expect(url).toContain(`${DUSSELDORF.lng},${DUSSELDORF.lat}`);
  });

  it("falls back to the straight line and says so when the router fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 503));

    const result = await routeBetween(COLOGNE, DUSSELDORF);

    expect(result.kind).toBe("line");
    expect(result.durationMinutes).toBeNull();
    expect(result.distanceKm).toBeCloseTo(
      straightLineKm(COLOGNE, DUSSELDORF),
      6,
    );
  });

  it("falls back when the router answers with a non-Ok code", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: "NoRoute", routes: [] }));
    expect((await routeBetween(COLOGNE, DUSSELDORF)).kind).toBe("line");
  });

  it("falls back when the route carries no usable distance", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ code: "Ok", routes: [{ distance: "far" }] }),
    );
    expect((await routeBetween(COLOGNE, DUSSELDORF)).kind).toBe("line");
  });

  it("falls back when the network throws", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await routeBetween(COLOGNE, DUSSELDORF);
    expect(result.kind).toBe("line");
    expect(result.distanceKm).toBeGreaterThan(0);
  });

  it("keeps a road result without a duration", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ code: "Ok", routes: [{ distance: 42_500 }] }),
    );

    const result = await routeBetween(COLOGNE, DUSSELDORF);
    expect(result.kind).toBe("road");
    expect(result.durationMinutes).toBeNull();
  });

  it("caches a route instead of asking again", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ code: "Ok", routes: [{ distance: 42_500, duration: 2_400 }] }),
    );

    await routeBetween(COLOGNE, DUSSELDORF);
    await routeBetween(COLOGNE, DUSSELDORF);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats the reverse direction as its own route", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ code: "Ok", routes: [{ distance: 42_500, duration: 2_400 }] }),
    );

    await routeBetween(COLOGNE, DUSSELDORF);
    await routeBetween(DUSSELDORF, COLOGNE);

    // One-way streets exist; A→B and B→A are not guaranteed to be equal.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
