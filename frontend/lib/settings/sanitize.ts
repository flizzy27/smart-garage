import {
  DEFAULT_SETTINGS,
  CURRENCY_OPTIONS,
  DISTANCE_UNIT_OPTIONS,
  HIDEABLE_VEHICLE_FIELDS,
  VOLUME_UNIT_OPTIONS,
  type CurrencyCode,
  type DistanceUnit,
  type HideableVehicleField,
  type ThemeMode,
  type VolumeUnit,
} from "@/lib/settings/types";
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

export function sanitizeDistanceUnit(value: unknown): DistanceUnit {
  return typeof value === "string" && (DISTANCE_UNIT_OPTIONS as readonly string[]).includes(value)
    ? (value as DistanceUnit)
    : DEFAULT_SETTINGS.distanceUnit;
}

export function sanitizeVolumeUnit(value: unknown): VolumeUnit {
  return typeof value === "string" && (VOLUME_UNIT_OPTIONS as readonly string[]).includes(value)
    ? (value as VolumeUnit)
    : DEFAULT_SETTINGS.volumeUnit;
}

/**
 * Accepts either the comma-separated database string or an already-parsed
 * array, drops anything that is not a known hideable field, and de-duplicates.
 * An unknown id (older/newer app version, hand-edited row) is ignored rather
 * than hiding a field that no longer exists.
 */
export function sanitizeHiddenVehicleFields(value: unknown): HideableVehicleField[] {
  const raw =
    typeof value === "string"
      ? value.split(",")
      : Array.isArray(value)
        ? value
        : [];

  const known = new Set<string>(HIDEABLE_VEHICLE_FIELDS);
  const seen = new Set<HideableVehicleField>();
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (known.has(trimmed)) seen.add(trimmed as HideableVehicleField);
  }
  return [...seen];
}

/** Serializes back into the comma-separated column format. */
export function serializeHiddenVehicleFields(value: unknown): string {
  return sanitizeHiddenVehicleFields(value).join(",");
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
