import {
  DEFAULT_SETTINGS,
  type ThemeMode,
  type UserSettings,
} from "./types";
import type { Locale } from "@/lib/i18n/routing";

const STORAGE_KEY = "smart-garage-settings";

export function readSettings(): UserSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      theme: parsed.theme ?? DEFAULT_SETTINGS.theme,
      locale: parsed.locale ?? DEFAULT_SETTINGS.locale,
      timezone: parsed.timezone ?? DEFAULT_SETTINGS.timezone,
      currency: parsed.currency ?? DEFAULT_SETTINGS.currency,
      designPreset: parsed.designPreset ?? DEFAULT_SETTINGS.designPreset,
      backgroundBlurPx: parsed.backgroundBlurPx ?? DEFAULT_SETTINGS.backgroundBlurPx,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: UserSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resolveThemeClass(theme: ThemeMode): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

export function applyThemeToDocument(theme: ThemeMode): void {
  const resolved = resolveThemeClass(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function isValidLocale(value: string): value is Locale {
  return value === "en" || value === "de";
}
