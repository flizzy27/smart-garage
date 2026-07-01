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
  writeSettings,
} from "@/lib/settings/storage";
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
  setQuickFuelEnabled: (enabled: boolean) => void;
  setMaintenanceDueSoonKm: (km: number) => void;
  setMaintenanceDueSoonDays: (days: number) => void;
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
    // The DB (initialSettings, rendered by the server) is the source of truth
    // for a signed-in user so preferences follow them across devices. The local
    // cache only fills in when there is no server value.
    const merged = initialSettings ? { ...stored, ...initialSettings } : stored;
    writeSettings(merged);
    applyThemeToDocument(merged.theme);
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

  const setQuickFuelEnabled = useCallback(
    (quickFuelEnabled: boolean) => {
      persist({ ...readSettings(), quickFuelEnabled });
    },
    [persist],
  );

  const setMaintenanceDueSoonKm = useCallback(
    (maintenanceDueSoonKm: number) => {
      persist({ ...readSettings(), maintenanceDueSoonKm });
    },
    [persist],
  );

  const setMaintenanceDueSoonDays = useCallback(
    (maintenanceDueSoonDays: number) => {
      persist({ ...readSettings(), maintenanceDueSoonDays });
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
      setQuickFuelEnabled,
      setMaintenanceDueSoonKm,
      setMaintenanceDueSoonDays,
    }),
    [
      settings,
      setTheme,
      setLocale,
      setTimezone,
      setCurrency,
      setQuickFuelEnabled,
      setMaintenanceDueSoonKm,
      setMaintenanceDueSoonDays,
    ],
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
