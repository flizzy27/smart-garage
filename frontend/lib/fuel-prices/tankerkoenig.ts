import { TtlCache } from "@/lib/fuel-prices/cache";
import {
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  type FuelKind,
  type FuelStation,
  type StationSearch,
  type StationsResult,
} from "@/lib/fuel-prices/types";

/**
 * Client for the Tankerkönig radius search.
 *
 * Configuration is a single environment variable, `TANKERKOENIG_API_KEY`,
 * following the same "set it in the Unraid template, no admin screen" approach
 * as the optional OIDC login. Without a key the feature is simply off — the
 * page explains where to get one instead of failing.
 *
 * Keys are free but personal: https://creativecommons.tankerkoenig.de
 */

const ENDPOINT = "https://creativecommons.tankerkoenig.de/json/list.php";

/**
 * One minute — the interval Tankerkönig's terms name for repeated requests.
 * Manual refreshes inside that window are answered from cache, which keeps the
 * UI responsive without spamming a free service.
 */
const CACHE_TTL_MS = 60_000;

const REQUEST_TIMEOUT_MS = 10_000;

const cache = new TtlCache<StationsResult>(CACHE_TTL_MS);

export class FuelPriceError extends Error {
  constructor(
    message: string,
    readonly reason:
      | "not-configured"
      | "invalid-key"
      | "rate-limited"
      | "upstream"
      | "timeout",
  ) {
    super(message);
    this.name = "FuelPriceError";
  }
}

export function getTankerkoenigApiKey(): string | null {
  const value = process.env.TANKERKOENIG_API_KEY;
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function isFuelPriceLookupConfigured(): boolean {
  return getTankerkoenigApiKey() !== null;
}

export function clampRadiusKm(value: number): number {
  if (!Number.isFinite(value)) return 5;
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, value));
}

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Upstream sends `false` for "no price known" and occasionally a string. Only a
 * positive finite number is a real price — everything else has to become
 * `null`, or a station with no diesel pump would look like the cheapest in
 * town at 0.00 €.
 */
function optionalPrice(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number") return null;
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeStation(raw: unknown): FuelStation | null {
  if (raw == null || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const id = optionalString(row.id);
  const lat = typeof row.lat === "number" ? row.lat : null;
  const lng = typeof row.lng === "number" ? row.lng : null;
  if (!id || lat == null || lng == null) return null;

  const prices: Record<FuelKind, number | null> = {
    e5: optionalPrice(row.e5),
    e10: optionalPrice(row.e10),
    diesel: optionalPrice(row.diesel),
  };

  return {
    id,
    name: optionalString(row.name) ?? optionalString(row.brand) ?? "—",
    brand: optionalString(row.brand),
    street: optionalString(row.street),
    houseNumber: optionalString(row.houseNumber),
    postCode:
      optionalString(row.postCode) ??
      (typeof row.postCode === "number" ? String(row.postCode) : null),
    place: optionalString(row.place),
    lat,
    lng,
    distanceKm: typeof row.dist === "number" ? row.dist : 0,
    isOpen: row.isOpen === true,
    prices,
  };
}

async function fetchStations(search: StationSearch): Promise<StationsResult> {
  const apikey = getTankerkoenigApiKey();
  if (!apikey) {
    throw new FuelPriceError("TANKERKOENIG_API_KEY is not set", "not-configured");
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("lat", search.lat.toFixed(6));
  url.searchParams.set("lng", search.lng.toFixed(6));
  url.searchParams.set("rad", String(clampRadiusKm(search.radiusKm)));
  // Always "all": one request carries every grade, so switching between E5,
  // E10 and Diesel in the UI costs no extra upstream call. Sorting happens
  // locally — upstream ignores `sort` for this mode anyway.
  url.searchParams.set("type", "all");
  url.searchParams.set("apikey", apikey);

  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new FuelPriceError("Tankerkönig did not respond in time", "timeout");
    }
    throw new FuelPriceError("Could not reach Tankerkönig", "upstream");
  }

  if (response.status === 429) {
    throw new FuelPriceError("Tankerkönig rate limit reached", "rate-limited");
  }
  if (!response.ok) {
    throw new FuelPriceError(
      `Tankerkönig responded with ${response.status}`,
      "upstream",
    );
  }

  const body = (await response.json()) as Record<string, unknown>;

  if (body?.ok !== true) {
    const message =
      optionalString(body?.message) ?? "Tankerkönig rejected the request";
    // The API reports a bad or unknown key as a normal 200 with ok:false, so
    // the message is the only way to tell "fix your key" from "try again".
    const looksLikeKeyProblem = /api ?key|apikey|schlüssel/i.test(message);
    throw new FuelPriceError(
      message,
      looksLikeKeyProblem ? "invalid-key" : "upstream",
    );
  }

  const rawStations = Array.isArray(body.stations) ? body.stations : [];
  const stations = rawStations
    .map(normalizeStation)
    .filter((station): station is FuelStation => station !== null);

  return {
    stations,
    fetchedAt: new Date().toISOString(),
    cached: false,
  };
}

/**
 * Rounded to ~100 m so that two people standing in the same street share a
 * cache entry instead of each triggering their own upstream request.
 */
function cacheKey(search: StationSearch): string {
  return [
    search.lat.toFixed(3),
    search.lng.toFixed(3),
    clampRadiusKm(search.radiusKm),
  ].join(":");
}

export async function listStationsNearby(
  search: StationSearch,
): Promise<StationsResult> {
  const { value, cached } = await cache.resolve(cacheKey(search), () =>
    fetchStations(search),
  );
  return { ...value, cached };
}

/** Test seam — the cache is process-wide and would otherwise leak between tests. */
export function clearStationCache(): void {
  cache.clear();
}
