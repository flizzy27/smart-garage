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
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  locale: "en",
  timezone: "Europe/Berlin",
  currency: "EUR",
  designPreset: DEFAULT_DESIGN_PRESET,
  backgroundBlurPx: DEFAULT_BACKGROUND_BLUR_PX,
};

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
