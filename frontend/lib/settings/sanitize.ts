import { DEFAULT_SETTINGS, CURRENCY_OPTIONS, type ThemeMode, type CurrencyCode } from "@/lib/settings/types";
import { routing, type Locale } from "@/lib/i18n/routing";
import { DESIGN_PRESETS, DEFAULT_DESIGN_PRESET, type DesignPresetId } from "@/lib/theme/presets";

/**
 * Defensive validation for values read back from the database.
 *
 * A `UserPreferences` row is written by app code, so it's normally already
 * valid — but a future enum change, a manual DB edit, or restoring a backup
 * from a different app version could leave a stale/unknown value behind.
 * Casting blindly (`row.theme as ThemeMode`) would silently propagate that
 * garbage into the UI; these helpers fall back to the built-in default
 * instead, the same way an unreadable settings cookie/localStorage value
 * would be reset rather than crash the app.
 */

const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];

export function sanitizeThemeMode(value: unknown): ThemeMode {
  return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value)
    ? (value as ThemeMode)
    : DEFAULT_SETTINGS.theme;
}

export function sanitizeLocale(value: unknown): Locale {
  return typeof value === "string" && (routing.locales as readonly string[]).includes(value)
    ? (value as Locale)
    : DEFAULT_SETTINGS.locale;
}

export function sanitizeCurrency(value: unknown): CurrencyCode {
  return typeof value === "string" && (CURRENCY_OPTIONS as readonly string[]).includes(value)
    ? (value as CurrencyCode)
    : DEFAULT_SETTINGS.currency;
}

const DESIGN_PRESET_IDS: readonly string[] = DESIGN_PRESETS.map((preset) => preset.id);

export function sanitizeDesignPreset(value: unknown): DesignPresetId {
  return typeof value === "string" && DESIGN_PRESET_IDS.includes(value)
    ? (value as DesignPresetId)
    : DEFAULT_DESIGN_PRESET;
}

export function sanitizeTimezone(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : DEFAULT_SETTINGS.timezone;
}
