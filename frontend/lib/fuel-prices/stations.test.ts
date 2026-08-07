import { describe, expect, it } from "vitest";
import {
  computeStationStats,
  filterStations,
  formatStationAddress,
  listBrands,
  sortStations,
  stationPrice,
} from "@/lib/fuel-prices/stations";
import type { FuelStation } from "@/lib/fuel-prices/types";

function station(overrides: Partial<FuelStation> & { id: string }): FuelStation {
  return {
    name: `Station ${overrides.id}`,
    brand: null,
    street: null,
    houseNumber: null,
    postCode: null,
    place: null,
    lat: 50,
    lng: 7,
    distanceKm: 1,
    isOpen: true,
    prices: { e5: null, e10: null, diesel: null },
    ...overrides,
  };
}

const STATIONS: FuelStation[] = [
  station({
    id: "a",
    brand: "Aral",
    distanceKm: 3,
    prices: { e5: 1.899, e10: 1.839, diesel: 1.759 },
  }),
  station({
    id: "b",
    brand: "shell",
    distanceKm: 1.2,
    prices: { e5: 1.929, e10: 1.869, diesel: 1.789 },
  }),
  station({
    id: "c",
    brand: "Aral",
    distanceKm: 5,
    isOpen: false,
    prices: { e5: 1.859, e10: 1.799, diesel: 1.729 },
  }),
  // Diesel-only station: no petrol prices at all.
  station({ id: "d", brand: "JET", distanceKm: 2, prices: { e5: null, e10: null, diesel: 1.699 } }),
];

describe("stationPrice", () => {
  it("reads the price of the requested grade", () => {
    expect(stationPrice(STATIONS[0], "e10")).toBeCloseTo(1.839, 5);
    expect(stationPrice(STATIONS[3], "e10")).toBeNull();
  });
});

describe("listBrands", () => {
  it("de-duplicates case-insensitively and sorts", () => {
    expect(listBrands(STATIONS)).toEqual(["Aral", "JET", "shell"]);
  });

  it("ignores stations without a brand", () => {
    expect(listBrands([station({ id: "x" })])).toEqual([]);
  });
});

describe("filterStations", () => {
  it("drops stations that do not sell the selected grade", () => {
    const result = filterStations(STATIONS, {
      kind: "e10",
      onlyOpen: false,
      brands: [],
    });
    expect(result.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps a diesel-only station when diesel is selected", () => {
    const result = filterStations(STATIONS, {
      kind: "diesel",
      onlyOpen: false,
      brands: [],
    });
    expect(result.map((entry) => entry.id)).toContain("d");
  });

  it("hides closed stations on request", () => {
    const result = filterStations(STATIONS, {
      kind: "e10",
      onlyOpen: true,
      brands: [],
    });
    expect(result.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("matches brands regardless of case", () => {
    const result = filterStations(STATIONS, {
      kind: "e5",
      onlyOpen: false,
      brands: ["SHELL"],
    });
    expect(result.map((entry) => entry.id)).toEqual(["b"]);
  });

  it("respects a maximum distance", () => {
    const result = filterStations(STATIONS, {
      kind: "e10",
      onlyOpen: false,
      brands: [],
      maxDistanceKm: 2,
    });
    expect(result.map((entry) => entry.id)).toEqual(["b"]);
  });
});

describe("sortStations", () => {
  it("sorts by price, cheapest first", () => {
    const sorted = sortStations(STATIONS, "e10", "price");
    expect(sorted.map((entry) => entry.id)).toEqual(["c", "a", "b", "d"]);
  });

  it("sorts by distance, nearest first", () => {
    const sorted = sortStations(STATIONS, "e10", "distance");
    expect(sorted.map((entry) => entry.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("never floats a station without a price to the top of a price sort", () => {
    const sorted = sortStations(STATIONS, "e10", "price");
    expect(sorted[sorted.length - 1].id).toBe("d");
  });

  it("breaks a price tie by distance", () => {
    const tied = [
      station({ id: "far", distanceKm: 9, prices: { e5: 1.8, e10: null, diesel: null } }),
      station({ id: "near", distanceKm: 2, prices: { e5: 1.8, e10: null, diesel: null } }),
    ];
    expect(sortStations(tied, "e5", "price").map((entry) => entry.id)).toEqual([
      "near",
      "far",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [...STATIONS];
    sortStations(input, "e10", "price");
    expect(input.map((entry) => entry.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("computeStationStats", () => {
  it("summarises the selected grade only", () => {
    const stats = computeStationStats(STATIONS, "e10", 50);

    expect(stats.total).toBe(4);
    expect(stats.withPrice).toBe(3);
    expect(stats.openNow).toBe(2);
    expect(stats.cheapest).toBeCloseTo(1.799, 5);
    expect(stats.mostExpensive).toBeCloseTo(1.869, 5);
    expect(stats.average).toBeCloseTo((1.839 + 1.869 + 1.799) / 3, 5);
    expect(stats.spread).toBeCloseTo(0.07, 5);
    expect(stats.savingPerFill).toBeCloseTo(3.5, 5);
    expect(stats.cheapestStationId).toBe("c");
  });

  it("prefers the nearer pump when two share the cheapest price", () => {
    const tied = [
      station({ id: "far", distanceKm: 9, prices: { e5: 1.7, e10: null, diesel: null } }),
      station({ id: "near", distanceKm: 2, prices: { e5: 1.7, e10: null, diesel: null } }),
    ];
    expect(computeStationStats(tied, "e5").cheapestStationId).toBe("near");
  });

  it("returns empty stats instead of NaN when nothing sells the grade", () => {
    const stats = computeStationStats([STATIONS[3]], "e10");
    expect(stats.withPrice).toBe(0);
    expect(stats.cheapest).toBeNull();
    expect(stats.average).toBeNull();
    expect(stats.savingPerFill).toBeNull();
    expect(stats.cheapestStationId).toBeNull();
  });

  it("never names a cheapest station the caller filtered away", () => {
    // The UI summarises the *visible* list for exactly this reason: station
    // "c" is the cheapest but closed, so with "only open" on it must not be
    // announced as the cheapest price and then be missing from the list.
    const visible = filterStations(STATIONS, {
      kind: "e10",
      onlyOpen: true,
      brands: [],
    });
    const stats = computeStationStats(visible, "e10");

    expect(stats.cheapestStationId).toBe("a");
    expect(stats.cheapest).toBeCloseTo(1.839, 5);
    expect(visible.some((entry) => entry.id === stats.cheapestStationId)).toBe(
      true,
    );
  });

  it("scales the saving with the fill-up size", () => {
    const small = computeStationStats(STATIONS, "e10", 10);
    const large = computeStationStats(STATIONS, "e10", 60);
    expect(large.savingPerFill! / small.savingPerFill!).toBeCloseTo(6, 5);
  });
});

describe("formatStationAddress", () => {
  it("joins what is present and skips what is not", () => {
    expect(
      formatStationAddress(
        station({
          id: "x",
          street: "Hauptstraße",
          houseNumber: "12",
          postCode: "50667",
          place: "Köln",
        }),
      ),
    ).toBe("Hauptstraße 12, 50667 Köln");

    expect(formatStationAddress(station({ id: "y", place: "Köln" }))).toBe("Köln");
    expect(formatStationAddress(station({ id: "z" }))).toBe("");
  });
});
