"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Locale } from "@/lib/i18n/routing";
import {
  applyThemeToDocument,
  readSettings,
  resolveThemeClass,
  writeSettings,
} from "@/lib/settings/storage";
import { applyDesignPresetToDocument } from "@/lib/theme/presets";
import { saveUserPreferences } from "@/lib/actions/preferences";
import {
  DEFAULT_SETTINGS,
  type CurrencyCode,
  type ThemeMode,
  type UserSettings,
} from "@/lib/settings/types";

type UserSettingsContextValue = {
  settings: UserSettings;
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
  setTimezone: (timezone: string) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setDesignPreset: (preset: UserSettings["designPreset"]) => void;
  setBackgroundBlurPx: (px: number) => void;
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(
  null,
);

export function UserSettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: UserSettings;
}) {
  const [settings, setSettings] = useState<UserSettings>(
    initialSettings ?? DEFAULT_SETTINGS,
  );

  useEffect(() => {
    const stored = readSettings();
    const merged = initialSettings
      ? { ...initialSettings, ...stored, theme: stored.theme ?? initialSettings.theme }
      : stored;
    applyThemeToDocument(merged.theme);
    const isDark = resolveThemeClass(merged.theme) === "dark";
    applyDesignPresetToDocument(merged.designPreset, isDark);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount sync
    setSettings(merged);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      if (readSettings().theme === "system") {
        applyThemeToDocument("system");
      }
    };
    media.addEventListener("change", onSystemThemeChange);
    return () => media.removeEventListener("change", onSystemThemeChange);
    // Mount-only: merge server initialSettings with localStorage once.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, []);

  const persist = useCallback((next: UserSettings) => {
    setSettings(next);
    writeSettings(next);
    applyThemeToDocument(next.theme);
    applyDesignPresetToDocument(
      next.designPreset,
      resolveThemeClass(next.theme) === "dark",
    );
    void saveUserPreferences(next);
  }, []);

  const setTheme = useCallback(
    (theme: ThemeMode) => {
      persist({ ...readSettings(), theme });
    },
    [persist],
  );

  const setLocale = useCallback(
    (locale: Locale) => {
      persist({ ...readSettings(), locale });
    },
    [persist],
  );

  const setTimezone = useCallback(
    (timezone: string) => {
      persist({ ...readSettings(), timezone });
    },
    [persist],
  );

  const setCurrency = useCallback(
    (currency: CurrencyCode) => {
      persist({ ...readSettings(), currency });
    },
    [persist],
  );

  const setDesignPreset = useCallback(
    (designPreset: UserSettings["designPreset"]) => {
      persist({ ...readSettings(), designPreset });
    },
    [persist],
  );

  const setBackgroundBlurPx = useCallback(
    (backgroundBlurPx: number) => {
      persist({ ...readSettings(), backgroundBlurPx });
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      settings,
      setTheme,
      setLocale,
      setTimezone,
      setCurrency,
      setDesignPreset,
      setBackgroundBlurPx,
    }),
    [settings, setTheme, setLocale, setTimezone, setCurrency, setDesignPreset, setBackgroundBlurPx],
  );

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error("useUserSettings must be used within UserSettingsProvider");
  }
  return context;
}
