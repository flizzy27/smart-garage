import type { FuelKind, FuelStation } from "@/lib/fuel-prices/types";

/**
 * Pure list operations on a set of stations — sorting, filtering and the
 * headline numbers. No fetching, no React, so all of it is unit-testable.
 */

export type StationSort = "price" | "distance";

export type StationFilters = {
  kind: FuelKind;
  onlyOpen: boolean;
  /** Empty means "every brand". Matched case-insensitively. */
  brands: string[];
  maxDistanceKm?: number | null;
};

export function stationPrice(
  station: FuelStation,
  kind: FuelKind,
): number | null {
  return station.prices[kind] ?? null;
}

/** Brands present in the result set, de-duplicated and alphabetical. */
export function listBrands(stations: FuelStation[]): string[] {
  const seen = new Map<string, string>();
  for (const station of stations) {
    const brand = station.brand?.trim();
    if (!brand) continue;
    const key = brand.toLowerCase();
    if (!seen.has(key)) seen.set(key, brand);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function filterStations(
  stations: FuelStation[],
  filters: StationFilters,
): FuelStation[] {
  const brandFilter = new Set(
    filters.brands.map((brand) => brand.trim().toLowerCase()).filter(Boolean),
  );

  return stations.filter((station) => {
    // A station that does not sell the selected grade has nothing to say about
    // it — showing it with a blank price would only add noise to the list.
    if (stationPrice(station, filters.kind) == null) return false;
    if (filters.onlyOpen && !station.isOpen) return false;
    if (
      filters.maxDistanceKm != null &&
      station.distanceKm > filters.maxDistanceKm
    ) {
      return false;
    }
    if (brandFilter.size > 0) {
      const brand = station.brand?.trim().toLowerCase();
      if (!brand || !brandFilter.has(brand)) return false;
    }
    return true;
  });
}

export function sortStations(
  stations: FuelStation[],
  kind: FuelKind,
  sort: StationSort,
): FuelStation[] {
  const sorted = [...stations];

  sorted.sort((a, b) => {
    if (sort === "distance") {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return comparePrice(a, b, kind);
    }
    const byPrice = comparePrice(a, b, kind);
    // Two pumps at the same price: the nearer one wins, which is what anyone
    // would actually choose.
    return byPrice !== 0 ? byPrice : a.distanceKm - b.distanceKm;
  });

  return sorted;
}

function comparePrice(a: FuelStation, b: FuelStation, kind: FuelKind): number {
  const priceA = stationPrice(a, kind);
  const priceB = stationPrice(b, kind);
  if (priceA == null && priceB == null) return 0;
  // Stations without a price sink to the bottom rather than to the top, where
  // they would look like the best deal.
  if (priceA == null) return 1;
  if (priceB == null) return -1;
  return priceA - priceB;
}

export type StationStats = {
  /** Stations in the raw result, before the grade filter. */
  total: number;
  /** Stations that actually sell the selected grade. */
  withPrice: number;
  openNow: number;
  cheapest: number | null;
  mostExpensive: number | null;
  average: number | null;
  /** Difference between the dearest and the cheapest pump. */
  spread: number | null;
  /** What the spread is worth on a given fill, in euro. */
  savingPerFill: number | null;
  /** Station id holding the cheapest price, for highlighting. */
  cheapestStationId: string | null;
};

export function computeStationStats(
  stations: FuelStation[],
  kind: FuelKind,
  fillLiters = 50,
): StationStats {
  const priced = stations.filter(
    (station) => stationPrice(station, kind) != null,
  );

  if (priced.length === 0) {
    return {
      total: stations.length,
      withPrice: 0,
      openNow: 0,
      cheapest: null,
      mostExpensive: null,
      average: null,
      spread: null,
      savingPerFill: null,
      cheapestStationId: null,
    };
  }

  const prices = priced.map((station) => stationPrice(station, kind)!);
  const cheapest = Math.min(...prices);
  const mostExpensive = Math.max(...prices);
  const spread = mostExpensive - cheapest;

  const cheapestStation = priced
    .filter((station) => stationPrice(station, kind) === cheapest)
    // Same price at two pumps → highlight the closer one.
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  return {
    total: stations.length,
    withPrice: priced.length,
    openNow: priced.filter((station) => station.isOpen).length,
    cheapest,
    mostExpensive,
    average: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    spread,
    savingPerFill: fillLiters > 0 ? spread * fillLiters : null,
    cheapestStationId: cheapestStation?.id ?? null,
  };
}

/** Street + number + postcode + town, skipping whatever the station omits. */
export function formatStationAddress(station: FuelStation): string {
  const street = [station.street, station.houseNumber]
    .filter(Boolean)
    .join(" ")
    .trim();
  const town = [station.postCode, station.place].filter(Boolean).join(" ").trim();
  return [street, town].filter(Boolean).join(", ");
}

/** Deep link that opens the station in whatever map app the device uses. */
export function stationMapUrl(station: FuelStation): string {
  return `https://www.openstreetmap.org/?mlat=${station.lat}&mlon=${station.lng}#map=17/${station.lat}/${station.lng}`;
}
