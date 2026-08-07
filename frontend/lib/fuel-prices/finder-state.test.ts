import { describe, expect, it } from "vitest";
import {
  DEFAULT_FINDER_SECTIONS,
  DEFAULT_FINDER_STATE,
  clampAutoRefreshMinutes,
  clampFillLiters,
  clampRadius,
  sanitizeFinderSections,
  sanitizeFinderState,
} from "@/lib/fuel-prices/finder-state";
import {
  MAX_RADIUS_KM,
  MIN_AUTO_REFRESH_MINUTES,
  MIN_RADIUS_KM,
} from "@/lib/fuel-prices/types";

describe("clampRadius", () => {
  it("keeps the radius inside what the price service allows", () => {
    expect(clampRadius(400)).toBe(MAX_RADIUS_KM);
    expect(clampRadius(0)).toBe(MIN_RADIUS_KM);
    expect(clampRadius(-5)).toBe(MIN_RADIUS_KM);
    expect(clampRadius(7)).toBe(7);
  });

  it("falls back to the default for junk", () => {
    expect(clampRadius("abc")).toBe(DEFAULT_FINDER_STATE.radiusKm);
    // Number(null) and Number("") are both 0, which would otherwise clamp to
    // the 1 km minimum and quietly shrink the search.
    expect(clampRadius(null)).toBe(DEFAULT_FINDER_STATE.radiusKm);
    expect(clampRadius(undefined)).toBe(DEFAULT_FINDER_STATE.radiusKm);
    expect(clampRadius("")).toBe(DEFAULT_FINDER_STATE.radiusKm);
    expect(clampRadius(true)).toBe(DEFAULT_FINDER_STATE.radiusKm);
  });
});

describe("clampAutoRefreshMinutes", () => {
  it("never polls faster than the fair-use floor", () => {
    expect(clampAutoRefreshMinutes(1)).toBe(MIN_AUTO_REFRESH_MINUTES);
    expect(clampAutoRefreshMinutes(0)).toBe(MIN_AUTO_REFRESH_MINUTES);
    expect(clampAutoRefreshMinutes(-30)).toBe(MIN_AUTO_REFRESH_MINUTES);
  });

  it("keeps the offered intervals", () => {
    expect(clampAutoRefreshMinutes(15)).toBe(15);
    expect(clampAutoRefreshMinutes(60)).toBe(60);
  });

  it("accepts a larger custom interval", () => {
    expect(clampAutoRefreshMinutes(120)).toBe(120);
  });
});

describe("clampFillLiters", () => {
  it("stays within a plausible tank size", () => {
    expect(clampFillLiters(0)).toBe(DEFAULT_FINDER_STATE.fillLiters);
    expect(clampFillLiters(5000)).toBe(200);
    expect(clampFillLiters(45)).toBe(45);
    expect(clampFillLiters(null)).toBe(DEFAULT_FINDER_STATE.fillLiters);
  });
});

describe("sanitizeFinderSections", () => {
  it("starts with location and overview open", () => {
    expect(sanitizeFinderSections(null)).toEqual(DEFAULT_FINDER_SECTIONS);
    expect(DEFAULT_FINDER_SECTIONS.location).toBe(true);
    expect(DEFAULT_FINDER_SECTIONS.filters).toBe(false);
  });

  it("restores saved sections and ignores anything else", () => {
    const result = sanitizeFinderSections({ filters: true, location: false, junk: true });
    expect(result.filters).toBe(true);
    expect(result.location).toBe(false);
    expect("junk" in result).toBe(false);
  });
});

describe("sanitizeFinderState", () => {
  it("falls back to defaults for a missing or broken blob", () => {
    expect(sanitizeFinderState(null)).toEqual(DEFAULT_FINDER_STATE);
    expect(sanitizeFinderState("nope")).toEqual(DEFAULT_FINDER_STATE);
  });

  it("keeps a valid saved state", () => {
    const result = sanitizeFinderState({
      kind: "diesel",
      radiusKm: 12,
      sort: "distance",
      onlyOpen: false,
      brands: ["Aral", "JET"],
      autoRefresh: true,
      autoRefreshMinutes: 15,
      fillLiters: 60,
      location: { lat: 50.94, lng: 6.96, label: "Köln", source: "search" },
    });

    expect(result.kind).toBe("diesel");
    expect(result.radiusKm).toBe(12);
    expect(result.sort).toBe("distance");
    expect(result.onlyOpen).toBe(false);
    expect(result.brands).toEqual(["Aral", "JET"]);
    expect(result.autoRefresh).toBe(true);
    expect(result.autoRefreshMinutes).toBe(15);
    expect(result.location).toEqual({
      lat: 50.94,
      lng: 6.96,
      label: "Köln",
      source: "search",
    });
  });

  it("rejects an unknown fuel grade", () => {
    // Super Plus and LPG are not reported to MTS-K and must never survive.
    expect(sanitizeFinderState({ kind: "superplus" }).kind).toBe(
      DEFAULT_FINDER_STATE.kind,
    );
    expect(sanitizeFinderState({ kind: "lpg" }).kind).toBe(
      DEFAULT_FINDER_STATE.kind,
    );
  });

  it("drops coordinates that cannot exist", () => {
    expect(
      sanitizeFinderState({ location: { lat: 120, lng: 6.9 } }).location,
    ).toBeNull();
    expect(
      sanitizeFinderState({ location: { lat: 50.9, lng: 400 } }).location,
    ).toBeNull();
    expect(
      sanitizeFinderState({ location: { lat: "x", lng: "y" } }).location,
    ).toBeNull();
  });

  it("defaults an unknown location source rather than trusting it", () => {
    expect(
      sanitizeFinderState({ location: { lat: 50.9, lng: 6.9, source: "evil" } })
        .location?.source,
    ).toBe("manual");
  });

  it("drops non-string brand entries", () => {
    expect(sanitizeFinderState({ brands: ["Aral", 5, null, ""] }).brands).toEqual([
      "Aral",
    ]);
  });
});
