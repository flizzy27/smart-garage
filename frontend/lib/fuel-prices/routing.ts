import { TtlCache } from "@/lib/fuel-prices/cache";

/**
 * Road distance between two points, from the public OSRM demo server.
 *
 * OSRM is free and needs no key, but it is explicitly a *demo* server: no
 * uptime guarantee, no more than one request a second, non-commercial use
 * only. That shapes everything here — results are cached hard, and a failure
 * is not an error but a fall back to the straight-line distance, which the UI
 * then labels as such rather than passing it off as a driving distance.
 *
 * A straight line is typically 20–30% shorter than the road, so quietly
 * substituting one for the other would make every cost estimate too low.
 */

const ENDPOINT = "https://router.project-osrm.org/route/v1/driving";
const REQUEST_TIMEOUT_MS = 8_000;
/** Roads do not move; an hour is a conservative lifetime for a route. */
const CACHE_TTL_MS = 60 * 60 * 1000;

export type RouteResult = {
  distanceKm: number;
  durationMinutes: number | null;
  /** "road" from the router, "line" when it fell back to great-circle. */
  kind: "road" | "line";
};

const cache = new TtlCache<RouteResult>(CACHE_TTL_MS);

const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle distance — the honest floor, never presented as a route. */
export function straightLineKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function cacheKey(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): string {
  // ~100 m precision: the same trip requested twice should not be two calls.
  return [
    from.lat.toFixed(3),
    from.lng.toFixed(3),
    to.lat.toFixed(3),
    to.lng.toFixed(3),
  ].join(":");
}

async function fetchRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RouteResult> {
  const fallback: RouteResult = {
    distanceKm: straightLineKm(from, to),
    durationMinutes: null,
    kind: "line",
  };

  try {
    const url = new URL(
      `${ENDPOINT}/${from.lng},${from.lat};${to.lng},${to.lat}`,
    );
    url.searchParams.set("overview", "false");
    url.searchParams.set("alternatives", "false");
    url.searchParams.set("steps", "false");

    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return fallback;

    const body = (await response.json()) as Record<string, unknown>;
    if (body?.code !== "Ok" || !Array.isArray(body.routes)) return fallback;

    const route = body.routes[0] as Record<string, unknown> | undefined;
    const distanceMeters = typeof route?.distance === "number" ? route.distance : null;
    if (distanceMeters == null || !Number.isFinite(distanceMeters)) {
      return fallback;
    }

    const durationSeconds =
      typeof route?.duration === "number" && Number.isFinite(route.duration)
        ? route.duration
        : null;

    return {
      distanceKm: distanceMeters / 1000,
      durationMinutes: durationSeconds != null ? durationSeconds / 60 : null,
      kind: "road",
    };
  } catch {
    return fallback;
  }
}

export async function routeBetween(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RouteResult> {
  const { value } = await cache.resolve(cacheKey(from, to), () =>
    fetchRoute(from, to),
  );
  return value;
}

/** Test seam — the cache is module-level and would leak between tests. */
export function clearRouteCache(): void {
  cache.clear();
}
