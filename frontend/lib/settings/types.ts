import type { Locale } from "@/lib/i18n/routing";

export type ThemeMode = "light" | "dark" | "system";

export type CurrencyCode = "EUR" | "USD" | "GBP" | "CHF";

export type UserSettings = {
  theme: ThemeMode;
  locale: Locale;
  timezone: string;
  currency: CurrencyCode;
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  locale: "en",
  timezone: "Europe/Berlin",
  currency: "EUR",
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
