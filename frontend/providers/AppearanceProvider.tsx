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
  DEFAULT_BACKGROUND_BLUR_PX,
} from "@/lib/theme/presets";

export type AppearanceSettings = {
  designPreset: DesignPresetId;
  backgroundBlurPx: number;
  hasBackground: boolean;
};

const DEFAULT_APPEARANCE: AppearanceSettings = {
  designPreset: "default",
  backgroundBlurPx: DEFAULT_BACKGROUND_BLUR_PX,
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
    // Design colours are driven by CSS from the `data-design` attribute, so we
    // only need to set the attribute — light/dark is handled independently by
    // the `.dark` class. No dark-mode listener is required here anymore.
    applyDesignPresetToDocument(appearance.designPreset);
    document.documentElement.style.setProperty(
      "--background-blur",
      `${clampBackgroundBlur(appearance.backgroundBlurPx)}px`,
    );
  }, [appearance.designPreset, appearance.backgroundBlurPx]);

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
