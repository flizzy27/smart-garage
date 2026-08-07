/**
 * Live fuel prices from German filling stations.
 *
 * Source is the **Tankerkönig** API, which republishes the price data every
 * German station is legally required to report to the Bundeskartellamt
 * (MTS-K). That law covers exactly three grades — Super E5, Super E10 and
 * Diesel — so those are the only ones that exist here. Super Plus, LPG, CNG
 * and electricity are **not** reported and cannot be shown; offering them
 * would mean inventing numbers.
 *
 * Data is licensed CC BY 4.0 and must be attributed wherever it is displayed.
 */

export const FUEL_KINDS = ["e5", "e10", "diesel"] as const;

export type FuelKind = (typeof FUEL_KINDS)[number];

export function isFuelKind(value: unknown): value is FuelKind {
  return (
    typeof value === "string" && (FUEL_KINDS as readonly string[]).includes(value)
  );
}

export type FuelStation = {
  id: string;
  name: string;
  brand: string | null;
  street: string | null;
  houseNumber: string | null;
  postCode: string | null;
  place: string | null;
  lat: number;
  lng: number;
  /** Straight-line distance from the search point, in kilometres. */
  distanceKm: number;
  isOpen: boolean;
  /** Euro per litre. `null` where the station reports no price for that grade. */
  prices: Record<FuelKind, number | null>;
};

export type StationSearch = {
  lat: number;
  lng: number;
  /** Kilometres. Tankerkönig caps this at 25. */
  radiusKm: number;
};

export type StationsResult = {
  stations: FuelStation[];
  /** When the upstream data was actually fetched (not when it was served). */
  fetchedAt: string;
  /** True when this answer came out of the local cache instead of upstream. */
  cached: boolean;
};

/** Attribution required by the CC BY 4.0 licence of the price data. */
export const FUEL_PRICE_ATTRIBUTION = {
  name: "Tankerkönig",
  url: "https://creativecommons.tankerkoenig.de",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
} as const;

/** Hard cap enforced by the upstream API. */
export const MAX_RADIUS_KM = 25;
export const MIN_RADIUS_KM = 1;

/**
 * Tankerkönig asks home-automation style clients not to poll more often than
 * once every five minutes. Auto-refresh honours that as a floor.
 */
export const MIN_AUTO_REFRESH_MINUTES = 5;

export const AUTO_REFRESH_OPTIONS = [5, 10, 15, 30, 60] as const;
