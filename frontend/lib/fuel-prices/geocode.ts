import { TtlCache } from "@/lib/fuel-prices/cache";
import { APP_VERSION } from "@/lib/app-version";

/**
 * Turning a typed address into coordinates, and coordinates back into a
 * readable place name, via OpenStreetMap's Nominatim.
 *
 * Nominatim is free and needs no key, which keeps the "type your town" path
 * working even when someone has not set up a Tankerkönig key yet. Its usage
 * policy asks for two things, both honoured here: a User-Agent that identifies
 * the application, and no more than one request per second. The requests are
 * proxied through the server rather than made from the browser so that the
 * User-Agent is actually ours and results can be cached for everyone.
 */

const SEARCH_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

/** Addresses do not move. A day is a conservative cache lifetime. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const REQUEST_TIMEOUT_MS = 8_000;

export type GeocodeResult = {
  label: string;
  lat: number;
  lng: number;
};

const searchCache = new TtlCache<GeocodeResult[]>(CACHE_TTL_MS);
const reverseCache = new TtlCache<string | null>(CACHE_TTL_MS);

function userAgent(): string {
  return `SmartGarage/${APP_VERSION} (+https://github.com/flizzy27/smart-garage)`;
}

async function requestJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      // Nominatim blocks requests without a descriptive User-Agent.
      "User-Agent": userAgent(),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Nominatim responded with ${response.status}`);
  return response.json();
}

function toResult(raw: unknown): GeocodeResult | null {
  if (raw == null || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  const label = typeof row.display_name === "string" ? row.display_name : null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !label) return null;
  return { label, lat, lng };
}

export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { value } = await searchCache.resolve(
    trimmed.toLowerCase(),
    async () => {
      const url = new URL(SEARCH_ENDPOINT);
      url.searchParams.set("q", trimmed);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "6");
      url.searchParams.set("addressdetails", "0");

      const body = await requestJson(url);
      if (!Array.isArray(body)) return [];
      return body
        .map(toResult)
        .filter((entry): entry is GeocodeResult => entry !== null);
    },
  );

  return value;
}

/** Coordinates → a short human-readable label, for the "you are here" line. */
export async function describeLocation(
  lat: number,
  lng: number,
): Promise<string | null> {
  const key = `${lat.toFixed(3)}:${lng.toFixed(3)}`;

  const { value } = await reverseCache.resolve(key, async () => {
    const url = new URL(REVERSE_ENDPOINT);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "14");

    try {
      const body = (await requestJson(url)) as Record<string, unknown>;
      const address = body?.address as Record<string, unknown> | undefined;
      const town =
        (typeof address?.city === "string" && address.city) ||
        (typeof address?.town === "string" && address.town) ||
        (typeof address?.village === "string" && address.village) ||
        (typeof address?.suburb === "string" && address.suburb) ||
        null;
      if (town) return town;
      return typeof body?.display_name === "string" ? body.display_name : null;
    } catch {
      // A missing label is cosmetic — the coordinates still work.
      return null;
    }
  });

  return value;
}
