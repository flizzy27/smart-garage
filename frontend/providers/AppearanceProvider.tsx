"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { DesignPresetId } from "@/lib/theme/presets";
import {
  applyDesignPresetToDocument,
  clampBackgroundBlur,
} from "@/lib/theme/presets";
import { resolveThemeClass } from "@/lib/settings/storage";

export type AppearanceSettings = {
  designPreset: DesignPresetId;
  backgroundBlurPx: number;
  hasBackground: boolean;
};

const DEFAULT_APPEARANCE: AppearanceSettings = {
  designPreset: "default",
  backgroundBlurPx: 8,
  hasBackground: false,
};

type AppearanceContextValue = AppearanceSettings & {
  setDesignPreset: (preset: DesignPresetId) => void;
  setBackgroundBlurPx: (px: number) => void;
  blurStyle: React.CSSProperties;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial?: Partial<AppearanceSettings>;
}) {
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    ...DEFAULT_APPEARANCE,
    ...initial,
  });

  useEffect(() => {
    const isDark =
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark");
    applyDesignPresetToDocument(appearance.designPreset, isDark);
    document.documentElement.style.setProperty(
      "--background-blur",
      `${clampBackgroundBlur(appearance.backgroundBlurPx)}px`,
    );
  }, [appearance.designPreset, appearance.backgroundBlurPx]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncPreset = () => {
      const isDark = resolveThemeClass(
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      ) === "dark";
      applyDesignPresetToDocument(appearance.designPreset, isDark);
    };
    media.addEventListener("change", syncPreset);
    return () => media.removeEventListener("change", syncPreset);
  }, [appearance.designPreset]);

  const setDesignPreset = useCallback((designPreset: DesignPresetId) => {
    setAppearance((prev) => ({ ...prev, designPreset }));
  }, []);

  const setBackgroundBlurPx = useCallback((backgroundBlurPx: number) => {
    setAppearance((prev) => ({
      ...prev,
      backgroundBlurPx: clampBackgroundBlur(backgroundBlurPx),
    }));
  }, []);

  const blurStyle = useMemo(
    () =>
      ({
        backdropFilter: appearance.hasBackground
          ? `blur(var(--background-blur, ${appearance.backgroundBlurPx}px))`
          : undefined,
        WebkitBackdropFilter: appearance.hasBackground
          ? `blur(var(--background-blur, ${appearance.backgroundBlurPx}px))`
          : undefined,
      }) as React.CSSProperties,
    [appearance.backgroundBlurPx, appearance.hasBackground],
  );

  const value = useMemo(
    () => ({
      ...appearance,
      setDesignPreset,
      setBackgroundBlurPx,
      blurStyle,
    }),
    [appearance, setDesignPreset, setBackgroundBlurPx, blurStyle],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }
  return ctx;
}
