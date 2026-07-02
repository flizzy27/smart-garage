import type { DistanceUnit } from "@/lib/settings/types";

export const KM_PER_MILE = 1.609344;

export function distanceUnitLabel(unit: DistanceUnit): string {
  return unit === "mi" ? "mi" : "km";
}

export function kmToPreferred(km: number, unit: DistanceUnit): number {
  return unit === "mi" ? km / KM_PER_MILE : km;
}

export function preferredToKm(value: number, unit: DistanceUnit): number {
  return unit === "mi" ? value * KM_PER_MILE : value;
}

export function roundDistanceForStorage(value: number, unit: DistanceUnit): number {
  return Math.max(0, Math.round(preferredToKm(value, unit)));
}

export function formatDistanceValue(
  km: number,
  locale: string,
  unit: DistanceUnit = "km",
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(Math.round(kmToPreferred(km, unit)));
}

export function formatDistance(
  km: number,
  locale: string,
  unit: DistanceUnit = "km",
): string {
  return `${formatDistanceValue(km, locale, unit)} ${distanceUnitLabel(unit)}`;
}

export function formDistanceValue(km: number | null | undefined, unit: DistanceUnit) {
  if (km == null) return "";
  return Math.round(kmToPreferred(km, unit));
}

export function parseFormDistanceToKm(
  value: FormDataEntryValue | null,
  unit: DistanceUnit,
): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return roundDistanceForStorage(parsed, unit);
}
