import {
  AUTO_REFRESH_OPTIONS,
  FUEL_KINDS,
  MAX_RADIUS_KM,
  MIN_AUTO_REFRESH_MINUTES,
  MIN_RADIUS_KM,
  isFuelKind,
  type FuelKind,
} from "@/lib/fuel-prices/types";
import type { StationSort } from "@/lib/fuel-prices/stations";

/**
 * Everything the station finder remembers between visits: which grade you
 * actually buy, how far you are willing to drive, your filters, and where you
 * were looking. Stored per device in `localStorage`, like the fuel calculator
 * — it is a view preference, not garage data.
 */

export type FinderLocation = {
  lat: number;
  lng: number;
  label: string | null;
  /** How the coordinates were obtained, so the UI can say so. */
  source: "gps" | "search" | "manual";
};

export const FINDER_SECTIONS = [
  "location",
  "filters",
  "refresh",
  "stats",
] as const;

export type FinderSectionId = (typeof FINDER_SECTIONS)[number];

export type FinderSectionState = Record<FinderSectionId, boolean>;

export type FinderState = {
  kind: FuelKind;
  radiusKm: number;
  sort: StationSort;
  onlyOpen: boolean;
  brands: string[];
  autoRefresh: boolean;
  autoRefreshMinutes: number;
  /** Tank size used to price the spread between cheapest and dearest. */
  fillLiters: number;
  location: FinderLocation | null;
  sections: FinderSectionState;
};

export const DEFAULT_FINDER_SECTIONS: FinderSectionState = {
  location: true,
  filters: false,
  refresh: false,
  stats: true,
};

export const DEFAULT_FINDER_STATE: FinderState = {
  // E10 is the most-sold grade in Germany, and the one MTS-K reports for
  // virtually every station.
  kind: "e10",
  radiusKm: 5,
  sort: "price",
  onlyOpen: true,
  brands: [],
  autoRefresh: false,
  autoRefreshMinutes: MIN_AUTO_REFRESH_MINUTES,
  fillLiters: 50,
  location: null,
  sections: DEFAULT_FINDER_SECTIONS,
};

/**
 * `Number(null)` is `0` and `Number("")` is `0` — both would sail past a
 * `Number.isFinite` check and clamp to the minimum instead of falling back to
 * the default. Anything that is not already a number, or a non-empty numeric
 * string, counts as absent.
 */
function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clampRadius(value: unknown): number {
  const parsed = toNumber(value);
  if (parsed == null) return DEFAULT_FINDER_STATE.radiusKm;
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, Math.round(parsed)));
}

/**
 * Never below the five-minute floor Tankerkönig's terms ask for — a stored
 * value from a hand-edited entry must not turn the app into a polling loop.
 */
export function clampAutoRefreshMinutes(value: unknown): number {
  const parsed = toNumber(value);
  if (parsed == null) return MIN_AUTO_REFRESH_MINUTES;
  const allowed = AUTO_REFRESH_OPTIONS.find((option) => option === parsed);
  if (allowed) return allowed;
  return Math.max(MIN_AUTO_REFRESH_MINUTES, Math.round(parsed));
}

export function clampFillLiters(value: unknown): number {
  const parsed = toNumber(value);
  if (parsed == null || parsed <= 0) return DEFAULT_FINDER_STATE.fillLiters;
  return Math.min(200, Math.max(1, Math.round(parsed)));
}

function sanitizeLocation(raw: unknown): FinderLocation | null {
  if (raw == null || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  const source =
    row.source === "gps" || row.source === "search" || row.source === "manual"
      ? row.source
      : "manual";

  return {
    lat,
    lng,
    label: typeof row.label === "string" && row.label ? row.label : null,
    source,
  };
}

export function sanitizeFinderSections(raw: unknown): FinderSectionState {
  const result = { ...DEFAULT_FINDER_SECTIONS };
  if (raw == null || typeof raw !== "object") return result;
  const source = raw as Record<string, unknown>;
  for (const id of FINDER_SECTIONS) {
    if (typeof source[id] === "boolean") result[id] = source[id] as boolean;
  }
  return result;
}

export function sanitizeFinderState(raw: unknown): FinderState {
  if (raw == null || typeof raw !== "object") return DEFAULT_FINDER_STATE;
  const source = raw as Record<string, unknown>;

  return {
    kind: isFuelKind(source.kind) ? source.kind : DEFAULT_FINDER_STATE.kind,
    radiusKm: clampRadius(source.radiusKm),
    sort: source.sort === "distance" ? "distance" : "price",
    onlyOpen:
      typeof source.onlyOpen === "boolean"
        ? source.onlyOpen
        : DEFAULT_FINDER_STATE.onlyOpen,
    brands: Array.isArray(source.brands)
      ? source.brands.filter(
          (brand): brand is string =>
            typeof brand === "string" && brand.trim().length > 0,
        )
      : [],
    autoRefresh:
      typeof source.autoRefresh === "boolean" ? source.autoRefresh : false,
    autoRefreshMinutes: clampAutoRefreshMinutes(source.autoRefreshMinutes),
    fillLiters: clampFillLiters(source.fillLiters),
    location: sanitizeLocation(source.location),
    sections: sanitizeFinderSections(source.sections),
  };
}

/** Every grade, in the order they are offered in the UI. */
export const FUEL_KIND_ORDER: readonly FuelKind[] = FUEL_KINDS;
