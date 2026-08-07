"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDistance, kmToPreferred } from "@/lib/regional/distance";
import type { DistanceUnit } from "@/lib/settings/types";
import { LocationAutocomplete, type PlaceHit } from "./LocationAutocomplete";

type Props = {
  distanceUnit: DistanceUnit;
  /** Called with the road distance, in the user's own distance unit. */
  onDistance: (valueInPreferredUnit: string) => void;
};

type Point = PlaceHit | null;

type RouteState = {
  distanceKm: number;
  durationMinutes: number | null;
  kind: "road" | "line";
} | null;

/**
 * "From here to there" for the fuel calculator.
 *
 * Start can come from the browser's location (one tap, one permission prompt)
 * or from the same type-ahead search as the destination. The resulting road
 * distance is written into the calculator's distance field, so the trip cost
 * updates without anyone having to know how far it is.
 */
export function RoutePlanner({ distanceUnit, onDistance }: Props) {
  const t = useTranslations("fuelCalculator.sections.route");
  const locale = useLocale();

  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [from, setFrom] = useState<Point>(null);
  const [to, setTo] = useState<Point>(null);

  const [locating, setLocating] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [route, setRoute] = useState<RouteState>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const useCurrentLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("unsupported");
      return;
    }
    // Browsers only hand out coordinates on a secure origin, and plenty of
    // homelab installs are reached over plain http://<nas-ip>:3000.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("insecure");
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocating(false);

        let label = t("currentLocation");
        try {
          const url = new URL("/api/fuel-prices/geocode", window.location.origin);
          url.searchParams.set("lat", String(latitude));
          url.searchParams.set("lng", String(longitude));
          const response = await fetch(url);
          const body = (await response.json()) as { label?: string | null };
          if (body.label) label = body.label;
        } catch {
          // A missing name is cosmetic; the coordinates are what matter.
        }

        setFrom({ label, lat: latitude, lng: longitude });
        setFromText(label);
      },
      (geoError) => {
        setLocating(false);
        setError(
          geoError.code === geoError.PERMISSION_DENIED ? "denied" : "unavailable",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [t]);

  const calculate = useCallback(async () => {
    if (!from || !to) return;

    setCalculating(true);
    setError(null);
    setApplied(false);

    try {
      const url = new URL(
        "/api/fuel-prices/route-distance",
        window.location.origin,
      );
      url.searchParams.set("fromLat", String(from.lat));
      url.searchParams.set("fromLng", String(from.lng));
      url.searchParams.set("toLat", String(to.lat));
      url.searchParams.set("toLng", String(to.lng));

      const response = await fetch(url);
      const body = (await response.json()) as {
        ok?: boolean;
        distanceKm?: number;
        durationMinutes?: number | null;
        kind?: "road" | "line";
      };

      if (!response.ok || body.ok !== true || body.distanceKm == null) {
        setError("failed");
        return;
      }

      setRoute({
        distanceKm: body.distanceKm,
        durationMinutes: body.durationMinutes ?? null,
        kind: body.kind ?? "line",
      });
    } catch {
      setError("failed");
    } finally {
      setCalculating(false);
    }
  }, [from, to]);

  const apply = useCallback(() => {
    if (!route) return;
    const preferred = kmToPreferred(route.distanceKm, distanceUnit);
    onDistance(String(Math.round(preferred)));
    setApplied(true);
  }, [route, distanceUnit, onDistance]);

  const swap = useCallback(() => {
    setFrom(to);
    setTo(from);
    setFromText(toText);
    setToText(fromText);
    setRoute(null);
    setApplied(false);
  }, [from, to, fromText, toText]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <LocationAutocomplete
          label={t("from")}
          placeholder={t("placeholder")}
          value={fromText}
          onValueChange={(value) => {
            setFromText(value);
            setFrom(null);
            setRoute(null);
          }}
          onPick={(hit) => {
            setFrom(hit);
            setRoute(null);
          }}
          searchingLabel={t("searching")}
          noResultsLabel={t("noResults")}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {locating ? t("locating") : t("useGps")}
          </button>
          <button
            type="button"
            onClick={swap}
            disabled={!from && !to}
            className="min-h-11 shrink-0 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            {t("swap")}
          </button>
        </div>

        <LocationAutocomplete
          label={t("to")}
          placeholder={t("placeholderTo")}
          value={toText}
          onValueChange={(value) => {
            setToText(value);
            setTo(null);
            setRoute(null);
          }}
          onPick={(hit) => {
            setTo(hit);
            setRoute(null);
          }}
          searchingLabel={t("searching")}
          noResultsLabel={t("noResults")}
        />
      </div>

      <button
        type="button"
        onClick={() => void calculate()}
        disabled={!from || !to || calculating}
        className="min-h-12 w-full rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {calculating ? t("calculating") : t("calculate")}
      </button>

      {error ? (
        <p className="rounded-xl border border-warning/30 bg-warning-muted px-3.5 py-2.5 text-xs text-foreground">
          {t(`errors.${error}`)}
        </p>
      ) : null}

      {route ? (
        <div className="rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("result")}
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">
            {formatDistance(route.distanceKm, locale, distanceUnit)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {/* Saying which kind of distance this is matters: a straight line
                is typically a fifth shorter than the road. */}
            {route.kind === "road"
              ? route.durationMinutes != null
                ? t("viaRoadWithTime", {
                    minutes: Math.round(route.durationMinutes),
                  })
                : t("viaRoad")
              : t("viaLine")}
          </p>
          <button
            type="button"
            onClick={apply}
            className="mt-3 min-h-11 w-full rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {applied ? t("applied") : t("apply")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
