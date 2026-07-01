import { describe, expect, it } from "vitest";
import {
  sanitizeCurrency,
  sanitizeDesignPreset,
  sanitizeLocale,
  sanitizeThemeMode,
  sanitizeTimezone,
} from "./sanitize";
import { DEFAULT_SETTINGS } from "./types";
import { DEFAULT_DESIGN_PRESET } from "@/lib/theme/presets";

describe("preference sanitizers (defensive fallback for stale/invalid DB values)", () => {
  it("passes through known-good theme values", () => {
    expect(sanitizeThemeMode("light")).toBe("light");
    expect(sanitizeThemeMode("dark")).toBe("dark");
    expect(sanitizeThemeMode("system")).toBe("system");
  });

  it("falls back to the default theme for unknown/invalid values", () => {
    expect(sanitizeThemeMode("neon")).toBe(DEFAULT_SETTINGS.theme);
    expect(sanitizeThemeMode(null)).toBe(DEFAULT_SETTINGS.theme);
    expect(sanitizeThemeMode(undefined)).toBe(DEFAULT_SETTINGS.theme);
    expect(sanitizeThemeMode(42)).toBe(DEFAULT_SETTINGS.theme);
    expect(sanitizeThemeMode('{"corrupted":true}')).toBe(DEFAULT_SETTINGS.theme);
  });

  it("passes through known locales and falls back otherwise", () => {
    expect(sanitizeLocale("en")).toBe("en");
    expect(sanitizeLocale("de")).toBe("de");
    expect(sanitizeLocale("fr")).toBe(DEFAULT_SETTINGS.locale);
    expect(sanitizeLocale(null)).toBe(DEFAULT_SETTINGS.locale);
  });

  it("passes through known currencies and falls back otherwise", () => {
    expect(sanitizeCurrency("EUR")).toBe("EUR");
    expect(sanitizeCurrency("USD")).toBe("USD");
    expect(sanitizeCurrency("XXX")).toBe(DEFAULT_SETTINGS.currency);
    expect(sanitizeCurrency(undefined)).toBe(DEFAULT_SETTINGS.currency);
  });

  it("passes through known design presets and falls back otherwise", () => {
    expect(sanitizeDesignPreset("default")).toBe("default");
    expect(sanitizeDesignPreset("does-not-exist")).toBe(DEFAULT_DESIGN_PRESET);
    expect(sanitizeDesignPreset(null)).toBe(DEFAULT_DESIGN_PRESET);
  });

  it("keeps a valid IANA-looking timezone string and falls back on empty/invalid", () => {
    expect(sanitizeTimezone("Europe/Berlin")).toBe("Europe/Berlin");
    expect(sanitizeTimezone("")).toBe(DEFAULT_SETTINGS.timezone);
    expect(sanitizeTimezone(null)).toBe(DEFAULT_SETTINGS.timezone);
    expect(sanitizeTimezone(123)).toBe(DEFAULT_SETTINGS.timezone);
  });
});
