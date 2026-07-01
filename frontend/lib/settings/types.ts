import type { Locale } from "@/lib/i18n/routing";
import type { DesignPresetId } from "@/lib/theme/presets";
import { DEFAULT_BACKGROUND_BLUR_PX, DEFAULT_DESIGN_PRESET } from "@/lib/theme/presets";

export type ThemeMode = "light" | "dark" | "system";

export type CurrencyCode = "EUR" | "USD" | "GBP" | "CHF";

export type UserSettings = {
  theme: ThemeMode;
  locale: Locale;
  timezone: string;
  currency: CurrencyCode;
  designPreset: DesignPresetId;
  backgroundBlurPx: number;
  maintenanceDueSoonKm: number;
  maintenanceDueSoonDays: number;
};

export const DEFAULT_MAINTENANCE_DUE_SOON_KM = 1500;
export const DEFAULT_MAINTENANCE_DUE_SOON_DAYS = 30;

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  locale: "en",
  timezone: "Europe/Berlin",
  currency: "EUR",
  designPreset: DEFAULT_DESIGN_PRESET,
  backgroundBlurPx: DEFAULT_BACKGROUND_BLUR_PX,
  maintenanceDueSoonKm: DEFAULT_MAINTENANCE_DUE_SOON_KM,
  maintenanceDueSoonDays: DEFAULT_MAINTENANCE_DUE_SOON_DAYS,
};

/** Suggested presets for the "soon due" mileage warning (km). */
export const MAINTENANCE_DUE_SOON_KM_OPTIONS = [250, 500, 750, 1000, 1500, 2000] as const;

/** Suggested presets for the "soon due" date warning (days). */
export const MAINTENANCE_DUE_SOON_DAYS_OPTIONS = [7, 14, 30, 60, 90] as const;

export function clampMaintenanceDueSoonKm(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MAINTENANCE_DUE_SOON_KM;
  return Math.min(50_000, Math.max(0, Math.round(value)));
}

export function clampMaintenanceDueSoonDays(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MAINTENANCE_DUE_SOON_DAYS;
  return Math.min(365, Math.max(0, Math.round(value)));
}

export const TIMEZONE_OPTIONS = [
  "Europe/Berlin",
  "Europe/Vienna",
  "Europe/Zurich",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
] as const;

export const CURRENCY_OPTIONS: CurrencyCode[] = ["EUR", "USD", "GBP", "CHF"];
