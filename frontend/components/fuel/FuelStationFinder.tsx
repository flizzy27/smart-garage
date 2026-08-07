"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { useUserSettings } from "@/providers/UserSettingsProvider";
import {
  distanceUnitLabel,
  formatDistance,
  kmToPreferred,
  preferredToKm,
} from "@/lib/regional/distance";
import {
  formatVolume,
  litersToPreferred,
  preferredToLiters,
  pricePerVolumeUnit,
  volumeUnitLabel,
} from "@/lib/regional/volume";
import {
  AUTO_REFRESH_OPTIONS,
  FUEL_PRICE_ATTRIBUTION,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  TANKERKOENIG_SIGNUP_URL,
  type FuelKind,
  type FuelStation,
} from "@/lib/fuel-prices/types";
import {
  computeStationStats,
  filterStations,
  formatStationAddress,
  listBrands,
  sortStations,
  stationMapUrl,
  stationPrice,
  type StationSort,
} from "@/lib/fuel-prices/stations";
import {
  DEFAULT_FINDER_STATE,
  FUEL_KIND_ORDER,
  clampAutoRefreshMinutes,
  clampFillLiters,
  clampRadius,
  type FinderLocation,
  type FinderSectionId,
  type FinderState,
} from "@/lib/fuel-prices/finder-state";
import {
  readFinderState,
  writeFinderState,
} from "@/lib/fuel-prices/finder-storage";
import { patchCalculatorPrice } from "@/lib/fuel/calculator-storage";
import { CalculatorSection } from "./CalculatorSection";
import { NumberField, ToggleField } from "./CalculatorControls";

type Props = {
  /** False when TANKERKOENIG_API_KEY is not set on the server. */
  configured: boolean;
};

type LoadState = "idle" | "loading" | "error";

type GeocodeHit = { label: string; lat: number; lng: number };

/**
 * Error reasons that have a translated message. Anything else — a future
 * server reason, a proxy returning its own JSON — falls back to the generic
 * one instead of rendering a raw key at the user.
 */
const KNOWN_ERROR_REASONS = [
  "not-configured",
  "invalid-key",
  "rate-limited",
  "invalid-location",
  "timeout",
  "upstream",
  "network",
  "unauthorized",
] as const;

/**
 * Long enough to collapse a slider drag into one search, short enough that
 * picking a location still feels immediate.
 */
const SEARCH_DEBOUNCE_MS = 450;

function knownErrorReason(reason: unknown): string {
  return typeof reason === "string" &&
    (KNOWN_ERROR_REASONS as readonly string[]).includes(reason)
    ? reason
    : "upstream";
}

const SECTION_ICONS: Record<FinderSectionId, string> = {
  location:
    "M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z",
  filters: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z",
  refresh:
    "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  stats: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
};

function Icon({ path }: { path: string }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

export function FuelStationFinder({ configured }: Props) {
  const t = useTranslations("fuelPrices");
  const locale = useLocale();
  const { settings } = useUserSettings();
  const { distanceUnit, volumeUnit, currency } = settings;

  const [state, setState] = useState<FinderState>(DEFAULT_FINDER_STATE);
  const [hydrated, setHydrated] = useState(false);

  const [stations, setStations] = useState<FuelStation[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [transferredId, setTransferredId] = useState<string | null>(null);
  /**
   * Wall clock for the "updated N minutes ago" line. Held in state and only
   * ever written from a callback — reading `Date.now()` while rendering would
   * make the output depend on when React happens to re-render.
   */
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage only exists after mount; reading it during render would break hydration
    setState(readFinderState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeFinderState(state);
  }, [hydrated, state]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const update = useCallback(
    <K extends keyof FinderState>(key: K, value: FinderState[K]) => {
      setState((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const toggleSection = useCallback((id: FinderSectionId) => {
    setState((current) => ({
      ...current,
      sections: { ...current.sections, [id]: !current.sections[id] },
    }));
  }, []);

  // -------------------------------------------------------------------------
  // Loading stations
  // -------------------------------------------------------------------------

  const location = state.location;
  const radiusKm = state.radiusKm;
  /**
   * The search is driven by these three primitives, never by the `location`
   * object itself. Attaching a place name to a location produces a new object
   * with identical coordinates, and depending on the object would refetch the
   * exact same search just because the label arrived.
   */
  const lat = location?.lat ?? null;
  const lng = location?.lng ?? null;

  // Kept in a ref so the auto-refresh interval never closes over a stale
  // location and quietly keeps polling the place you left.
  const loadRef = useRef<() => void>(() => {});
  /**
   * Monotonic request counter. Responses can come back out of order, and
   * without this a slow 3 km response landing after the 20 km one would
   * silently shrink the list.
   */
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (lat == null || lng == null || !configured) return;

    const requestId = ++requestIdRef.current;
    setLoadState("loading");
    setErrorReason(null);

    try {
      const url = new URL("/api/fuel-prices/stations", window.location.origin);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lng", String(lng));
      url.searchParams.set("radius", String(radiusKm));

      const response = await fetch(url, { cache: "no-store" });
      const body = (await response.json()) as {
        ok?: boolean;
        reason?: string;
        stations?: FuelStation[];
        fetchedAt?: string;
      };

      if (requestId !== requestIdRef.current) return;

      if (!response.ok || body.ok !== true) {
        setErrorReason(knownErrorReason(body.reason));
        setLoadState("error");
        return;
      }

      setStations(body.stations ?? []);
      setFetchedAt(body.fetchedAt ?? new Date().toISOString());
      setNow(Date.now());
      setLoadState("idle");
    } catch {
      if (requestId !== requestIdRef.current) return;
      setErrorReason("network");
      setLoadState("error");
    }
  }, [lat, lng, radiusKm, configured]);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  /**
   * First load, and any change of location or radius.
   *
   * Debounced, because a range input fires on every step of a drag: pulling
   * the radius from 1 km to 25 km would otherwise be 25 separate searches, and
   * each distinct radius is a fresh cache key that reaches Tankerkönig. That
   * is precisely the request storm the fair-use rules — and our own copy about
   * them — say we avoid.
   */
  useEffect(() => {
    if (!hydrated || !configured || lat == null || lng == null) return;
    const timer = setTimeout(() => loadRef.current(), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [hydrated, configured, lat, lng, radiusKm]);

  // Auto-refresh. Paused while the tab is hidden — a background tab polling a
  // free API every five minutes is exactly what the terms ask us not to do.
  useEffect(() => {
    if (!hydrated || !configured || !state.autoRefresh || !location) return;

    const intervalMs = clampAutoRefreshMinutes(state.autoRefreshMinutes) * 60_000;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadRef.current();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    hydrated,
    configured,
    state.autoRefresh,
    state.autoRefreshMinutes,
    location,
  ]);

  // -------------------------------------------------------------------------
  // Location
  // -------------------------------------------------------------------------

  const applyLocation = useCallback(
    (next: FinderLocation) => {
      setLocationError(null);
      update("location", next);
    },
    [update],
  );

  const describe = useCallback(async (lat: number, lng: number) => {
    try {
      const url = new URL("/api/fuel-prices/geocode", window.location.origin);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lng", String(lng));
      const response = await fetch(url);
      const body = (await response.json()) as { label?: string | null };
      return body.label ?? null;
    } catch {
      return null;
    }
  }, []);

  const useGps = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("unsupported");
      return;
    }
    // Browsers refuse geolocation on plain HTTP. A lot of homelab installs are
    // reached over http://<nas-ip>:3000, so name the cause instead of showing
    // a bare "permission denied".
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setLocationError("insecure");
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        applyLocation({
          lat: latitude,
          lng: longitude,
          label: null,
          source: "gps",
        });
        setLocating(false);
        // The place name arrives after the coordinates. Only attach it if the
        // user has not moved the search somewhere else in the meantime,
        // otherwise a searched-for town would get labelled with the GPS fix.
        void describe(latitude, longitude).then((label) => {
          if (!label) return;
          setState((current) =>
            current.location?.lat === latitude &&
            current.location?.lng === longitude
              ? { ...current, location: { ...current.location, label } }
              : current,
          );
        });
      },
      (error) => {
        setLocating(false);
        setLocationError(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [applyLocation, describe]);

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    setSearching(true);
    setLocationError(null);
    try {
      const url = new URL("/api/fuel-prices/geocode", window.location.origin);
      url.searchParams.set("q", trimmed);
      const response = await fetch(url);
      const body = (await response.json()) as { results?: GeocodeHit[] };
      const results = body.results ?? [];
      setHits(results);
      if (results.length === 0) setLocationError("no-results");
    } catch {
      setLocationError("search-failed");
    } finally {
      setSearching(false);
    }
  }, [query]);

  // -------------------------------------------------------------------------
  // Derived list
  // -------------------------------------------------------------------------

  const brands = useMemo(() => listBrands(stations), [stations]);

  const visibleStations = useMemo(() => {
    const filtered = filterStations(stations, {
      kind: state.kind,
      onlyOpen: state.onlyOpen,
      brands: state.brands,
    });
    return sortStations(filtered, state.kind, state.sort);
  }, [stations, state.kind, state.onlyOpen, state.brands, state.sort]);

  /**
   * Prices are summarised over the stations the user can actually see. Doing
   * it over the raw result would advertise a "cheapest" price at a station
   * that the open/brand filters have hidden — no row would carry the badge,
   * and every visible row would be priced against a pump you cannot use.
   */
  const stats = useMemo(
    () => computeStationStats(visibleStations, state.kind, state.fillLiters),
    [visibleStations, state.kind, state.fillLiters],
  );

  /** Coverage is about the raw result set: how many stations sell this grade. */
  const coverage = useMemo(
    () => computeStationStats(stations, state.kind),
    [stations, state.kind],
  );

  // -------------------------------------------------------------------------
  // Formatting
  // -------------------------------------------------------------------------

  const volumeLabel = volumeUnitLabel(volumeUnit);
  const distanceLabel = distanceUnitLabel(distanceUnit);

  /**
   * Prices come from German pumps and are always euro. Formatting them in the
   * user's preferred currency would relabel the number without converting it,
   * so the currency stays EUR and only the volume unit follows the preference.
   */
  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }),
    [locale],
  );

  const euro = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale],
  );

  const formatPrice = useCallback(
    (pricePerLiter: number | null | undefined) =>
      pricePerLiter == null
        ? "—"
        : priceFormatter.format(pricePerVolumeUnit(pricePerLiter, volumeUnit)),
    [priceFormatter, volumeUnit],
  );

  const relativeUpdated = useMemo(() => {
    if (!fetchedAt || now == null) return null;
    const minutes = Math.max(
      0,
      Math.round((now - new Date(fetchedAt).getTime()) / 60_000),
    );
    return minutes < 1 ? t("updatedJustNow") : t("updatedAgo", { minutes });
  }, [fetchedAt, now, t]);

  const radiusPreferred = Math.round(kmToPreferred(radiusKm, distanceUnit));
  const radiusMaxPreferred = Math.floor(
    kmToPreferred(MAX_RADIUS_KM, distanceUnit),
  );
  const radiusMinPreferred = Math.max(
    1,
    Math.round(kmToPreferred(MIN_RADIUS_KM, distanceUnit)),
  );

  /**
   * The fill-volume field keeps its own draft string so it can be emptied
   * while typing. Feeding the clamped number straight back would turn a
   * cleared field into "50" the moment Backspace removes the last digit,
   * because an empty string parses as 0 and 0 falls back to the default.
   */
  const [fillDraft, setFillDraft] = useState<string | null>(null);

  const fillInPreferred = Math.round(
    litersToPreferred(state.fillLiters, volumeUnit),
  );

  const handleFillChange = useCallback(
    (value: string) => {
      setFillDraft(value);
      if (value.trim() === "") return;
      const parsed = Number(value.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) return;
      update("fillLiters", clampFillLiters(preferredToLiters(parsed, volumeUnit)));
    },
    [update, volumeUnit],
  );

  const transferPrice = useCallback(
    (station: FuelStation) => {
      const price = stationPrice(station, state.kind);
      if (price == null) return;
      const applied = patchCalculatorPrice(price, { distanceUnit, volumeUnit });
      if (applied) setTransferredId(station.id);
    },
    [state.kind, distanceUnit, volumeUnit],
  );

  // Transferring only makes sense while the calculator speaks the same
  // currency — moving 1.799 € into a field labelled "$/gal" would be a lie.
  const canTransfer = currency === "EUR";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!configured) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning-muted px-5 py-6">
        <h2 className="text-sm font-semibold text-foreground">
          {t("setup.title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("setup.body")}
        </p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>{t("setup.step1")}</li>
          <li>{t("setup.step2")}</li>
          <li>{t("setup.step3")}</li>
        </ol>
        {/* The manual review is the reason nothing happens for days. Saying so
            up front stops it looking like a broken signup. */}
        <p className="mt-3 rounded-lg border border-warning/30 bg-card/60 px-3.5 py-2.5 text-xs leading-relaxed text-foreground">
          {t("setup.reviewNotice")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={TANKERKOENIG_SIGNUP_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            {t("setup.cta")}
          </a>
          <Link
            href="/settings/fuel-prices"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t("setup.enterKey")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grade picker + refresh: the two controls worth reaching without
          scrolling, so they stay pinned. */}
      <div className="sticky top-0 z-20 rounded-2xl border border-border bg-card p-3 shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <div className="flex items-center gap-2">
          <div
            className="flex flex-1 gap-1.5 overflow-x-auto"
            role="group"
            aria-label={t("fuelKindLabel")}
          >
            {FUEL_KIND_ORDER.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => update("kind", kind)}
                aria-pressed={state.kind === kind}
                className={`min-h-11 flex-1 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition-colors ${
                  state.kind === kind
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {t(`fuelKinds.${kind}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loadState === "loading" || !location}
            aria-label={t("refresh")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <svg
              className={`h-5 w-5 ${loadState === "loading" ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d={SECTION_ICONS.refresh} />
            </svg>
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-muted-foreground">
          {relativeUpdated ? <span>{relativeUpdated}</span> : null}
          {state.autoRefresh ? (
            <span className="text-accent">
              {t("autoRefreshOn", { minutes: state.autoRefreshMinutes })}
            </span>
          ) : null}
          {location ? (
            <span className="truncate">
              {location.label ??
                t("coordinates", {
                  lat: location.lat.toFixed(3),
                  lng: location.lng.toFixed(3),
                })}
            </span>
          ) : null}
        </div>
      </div>

      {/* --- Location & radius ------------------------------------------- */}
      <CalculatorSection
        title={t("sections.location.title")}
        hint={t("sections.location.hint")}
        icon={<Icon path={SECTION_ICONS.location} />}
        open={state.sections.location}
        onToggle={() => toggleSection("location")}
        summary={
          location
            ? t("sections.location.summary", {
                place:
                  location.label ??
                  t("coordinates", {
                    lat: location.lat.toFixed(2),
                    lng: location.lng.toFixed(2),
                  }),
                radius: formatDistance(radiusKm, locale, distanceUnit),
              })
            : undefined
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={useGps}
              disabled={locating}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Icon path={SECTION_ICONS.location} />
              {locating ? t("sections.location.locating") : t("sections.location.useGps")}
            </button>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="station-search"
              className="block text-xs font-medium text-muted-foreground"
            >
              {t("sections.location.searchLabel")}
            </label>
            <div className="flex gap-2">
              <input
                id="station-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void runSearch();
                  }
                }}
                placeholder={t("sections.location.searchPlaceholder")}
                className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-card px-3.5 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <button
                type="button"
                onClick={() => void runSearch()}
                disabled={searching || query.trim().length < 2}
                className="min-h-12 shrink-0 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
              >
                {searching ? t("sections.location.searching") : t("sections.location.search")}
              </button>
            </div>

            {hits.length > 0 ? (
              <ul className="space-y-1.5">
                {hits.map((hit) => (
                  <li key={`${hit.lat},${hit.lng}`}>
                    <button
                      type="button"
                      onClick={() => {
                        applyLocation({
                          lat: hit.lat,
                          lng: hit.lng,
                          label: hit.label,
                          source: "search",
                        });
                        setHits([]);
                        setQuery("");
                      }}
                      className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      {hit.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {locationError ? (
              <p className="rounded-xl border border-warning/30 bg-warning-muted px-3.5 py-2.5 text-xs text-foreground">
                {t(`locationErrors.${locationError}`)}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="station-radius"
                className="text-xs font-medium text-muted-foreground"
              >
                {t("sections.location.radius")}
              </label>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {radiusPreferred} {distanceLabel}
              </span>
            </div>
            <input
              id="station-radius"
              type="range"
              min={radiusMinPreferred}
              max={radiusMaxPreferred}
              step={1}
              value={Math.min(
                radiusMaxPreferred,
                Math.max(radiusMinPreferred, radiusPreferred),
              )}
              onChange={(event) =>
                update(
                  "radiusKm",
                  clampRadius(preferredToKm(Number(event.target.value), distanceUnit)),
                )
              }
              className="h-11 w-full cursor-pointer accent-[var(--accent)]"
            />
            <p className="text-[11px] text-muted-foreground">
              {t("sections.location.radiusHint", {
                max: formatDistance(MAX_RADIUS_KM, locale, distanceUnit),
              })}
            </p>
          </div>
        </div>
      </CalculatorSection>

      {/* --- Filters ------------------------------------------------------ */}
      <CalculatorSection
        title={t("sections.filters.title")}
        hint={t("sections.filters.hint")}
        icon={<Icon path={SECTION_ICONS.filters} />}
        open={state.sections.filters}
        onToggle={() => toggleSection("filters")}
        summary={t("sections.filters.summary", {
          sort: t(`sort.${state.sort}`),
          count: visibleStations.length,
        })}
      >
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t("sections.filters.sort")}
            </span>
            <div className="flex gap-1.5">
              {(["price", "distance"] as StationSort[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => update("sort", option)}
                  aria-pressed={state.sort === option}
                  className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-medium transition-colors ${
                    state.sort === option
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t(`sort.${option}`)}
                </button>
              ))}
            </div>
          </div>

          <ToggleField
            id="station-only-open"
            label={t("sections.filters.onlyOpen")}
            hint={t("sections.filters.onlyOpenHint")}
            checked={state.onlyOpen}
            onChange={(checked) => update("onlyOpen", checked)}
          />

          {brands.length > 1 ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("sections.filters.brands")}
                </span>
                {state.brands.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => update("brands", [])}
                    className="text-[11px] font-medium text-accent"
                  >
                    {t("sections.filters.allBrands")}
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {brands.map((brand) => {
                  const active = state.brands.includes(brand);
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() =>
                        update(
                          "brands",
                          active
                            ? state.brands.filter((entry) => entry !== brand)
                            : [...state.brands, brand],
                        )
                      }
                      aria-pressed={active}
                      className={`min-h-9 rounded-full px-3 text-xs font-medium transition-colors ${
                        active
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </CalculatorSection>

      {/* --- Refreshing --------------------------------------------------- */}
      <CalculatorSection
        title={t("sections.refresh.title")}
        hint={t("sections.refresh.hint")}
        icon={<Icon path={SECTION_ICONS.refresh} />}
        open={state.sections.refresh}
        onToggle={() => toggleSection("refresh")}
        summary={
          state.autoRefresh
            ? t("autoRefreshOn", { minutes: state.autoRefreshMinutes })
            : t("sections.refresh.manualOnly")
        }
      >
        <div className="space-y-4">
          <ToggleField
            id="station-auto-refresh"
            label={t("sections.refresh.auto")}
            hint={t("sections.refresh.autoHint")}
            checked={state.autoRefresh}
            onChange={(checked) => update("autoRefresh", checked)}
          />

          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t("sections.refresh.interval")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {AUTO_REFRESH_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() =>
                    update("autoRefreshMinutes", clampAutoRefreshMinutes(minutes))
                  }
                  aria-pressed={state.autoRefreshMinutes === minutes}
                  disabled={!state.autoRefresh}
                  className={`min-h-11 min-w-16 rounded-xl px-3 text-sm font-medium transition-colors disabled:opacity-40 ${
                    state.autoRefreshMinutes === minutes
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t("minutesShort", { minutes })}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loadState === "loading" || !location}
            className="min-h-12 w-full rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            {loadState === "loading" ? t("refreshing") : t("refreshNow")}
          </button>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("sections.refresh.fairUse")}
          </p>
        </div>
      </CalculatorSection>

      {/* --- Stats -------------------------------------------------------- */}
      <CalculatorSection
        title={t("sections.stats.title")}
        hint={t("sections.stats.hint")}
        icon={<Icon path={SECTION_ICONS.stats} />}
        open={state.sections.stats}
        onToggle={() => toggleSection("stats")}
        summary={
          stats.cheapest != null
            ? t("sections.stats.summary", { price: formatPrice(stats.cheapest) })
            : undefined
        }
      >
        {stats.withPrice === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noPricesYet")}</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatBox
                label={t("sections.stats.cheapest")}
                value={formatPrice(stats.cheapest)}
                tone="positive"
              />
              <StatBox
                label={t("sections.stats.average")}
                value={formatPrice(stats.average)}
              />
              <StatBox
                label={t("sections.stats.mostExpensive")}
                value={formatPrice(stats.mostExpensive)}
              />
              <StatBox
                label={t("sections.stats.spread")}
                value={formatPrice(stats.spread)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                id="station-fill"
                label={t("sections.stats.fillVolume")}
                unit={volumeLabel}
                value={fillDraft ?? String(fillInPreferred)}
                onChange={handleFillChange}
                max={Math.round(litersToPreferred(200, volumeUnit))}
              />
              <div className="rounded-xl border border-success/30 bg-success/10 px-3.5 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("sections.stats.savingPerFill")}
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                  {stats.savingPerFill != null
                    ? euro.format(stats.savingPerFill)
                    : "—"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("sections.stats.savingHint", {
                    volume: formatVolume(state.fillLiters, locale, volumeUnit, 0),
                  })}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {t("sections.stats.coverage", {
                withPrice: coverage.withPrice,
                total: coverage.total,
                fuel: t(`fuelKinds.${state.kind}`),
                open: coverage.openNow,
              })}
            </p>
          </div>
        )}
      </CalculatorSection>

      {/* --- Station list ------------------------------------------------- */}
      <div className="space-y-2">
        {!location ? (
          <EmptyState text={t("empty.noLocation")} />
        ) : loadState === "error" ? (
          <div className="rounded-2xl border border-danger/30 bg-danger-muted px-4 py-4">
            <p className="text-sm font-medium text-foreground">
              {t(`errors.${errorReason ?? "upstream"}`)}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t("tryAgain")}
            </button>
          </div>
        ) : loadState === "loading" && stations.length === 0 ? (
          <EmptyState text={t("empty.loading")} />
        ) : visibleStations.length === 0 ? (
          <EmptyState
            text={
              stations.length === 0
                ? t("empty.noStations")
                : t("empty.filteredOut")
            }
          />
        ) : (
          visibleStations.map((station) => {
            const price = stationPrice(station, state.kind);
            const isCheapest = station.id === stats.cheapestStationId;
            const delta =
              price != null && stats.cheapest != null
                ? price - stats.cheapest
                : null;

            return (
              <article
                key={station.id}
                className={`rounded-2xl border bg-card px-4 py-3.5 shadow-sm transition-colors ${
                  isCheapest
                    ? "border-success/50 ring-1 ring-success/20"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {station.name}
                      </h3>
                      {isCheapest ? (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                          {t("cheapest")}
                        </span>
                      ) : null}
                      {!station.isOpen ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("closed")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatStationAddress(station)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistance(station.distanceKm, locale, distanceUnit)}
                      {delta != null && delta > 0
                        ? ` · ${t("moreThanCheapest", { amount: formatPrice(delta) })}`
                        : ""}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      className={`text-xl font-semibold tabular-nums ${
                        isCheapest ? "text-success" : "text-foreground"
                      }`}
                    >
                      {formatPrice(price)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t("perVolume", { unit: volumeLabel })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <a
                    href={stationMapUrl(station)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="min-h-9 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {t("openMap")}
                  </a>
                  {canTransfer ? (
                    <button
                      type="button"
                      onClick={() => transferPrice(station)}
                      className="min-h-9 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {transferredId === station.id
                        ? t("priceTransferred")
                        : t("useInCalculator")}
                    </button>
                  ) : null}
                  {OTHER_KINDS[state.kind].map((kind) =>
                    station.prices[kind] != null ? (
                      <span
                        key={kind}
                        className="min-h-9 rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground"
                      >
                        {t(`fuelKinds.${kind}`)} {formatPrice(station.prices[kind])}
                      </span>
                    ) : null,
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      <p className="px-1 pb-2 text-[11px] leading-relaxed text-muted-foreground">
        {t("attribution")}{" "}
        <a
          href={FUEL_PRICE_ATTRIBUTION.url}
          target="_blank"
          rel="noreferrer noopener"
          className="underline"
        >
          {FUEL_PRICE_ATTRIBUTION.name}
        </a>{" "}
        ·{" "}
        <a
          href={FUEL_PRICE_ATTRIBUTION.licenseUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="underline"
        >
          {FUEL_PRICE_ATTRIBUTION.license}
        </a>
      </p>
    </div>
  );
}

/** The two grades that are not currently selected, for the secondary chips. */
const OTHER_KINDS: Record<FuelKind, FuelKind[]> = {
  e5: ["e10", "diesel"],
  e10: ["e5", "diesel"],
  diesel: ["e5", "e10"],
};

function StatBox({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive";
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        tone === "positive"
          ? "border-success/30 bg-success/10"
          : "border-border bg-muted/40"
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
