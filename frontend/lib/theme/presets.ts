export type DesignPresetId =
  | "default"
  | "space"
  | "forest"
  | "sunset"
  | "midnight"
  | "rose";

export type DesignPreset = {
  id: DesignPresetId;
  nameKey: string;
  descriptionKey: string;
  /** CSS variables applied on :root / .dark via data-design attribute */
  light: Record<string, string>;
  dark: Record<string, string>;
  /** Optional gradient for sidebar header accent strip */
  sidebarGradient?: string;
};

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: "default",
    nameKey: "default",
    descriptionKey: "defaultDesc",
    light: {},
    dark: {},
  },
  {
    id: "space",
    nameKey: "space",
    descriptionKey: "spaceDesc",
    sidebarGradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #8b5cf6 100%)",
    light: {
      "--background": "#eef6ff",
      "--surface": "#f8fbff",
      "--accent": "#0284c7",
      "--accent-foreground": "#ffffff",
      "--sidebar": "#e0f2fe",
      "--sidebar-active-foreground": "#0369a1",
      "--sidebar-active": "#ffffff",
    },
    dark: {
      "--background": "#030712",
      "--surface": "#0c1529",
      "--accent": "#38bdf8",
      "--accent-foreground": "#0c4a6e",
      "--sidebar": "#0a1628",
      "--sidebar-active-foreground": "#7dd3fc",
      "--sidebar-active": "#1e3a5f",
    },
  },
  {
    id: "forest",
    nameKey: "forest",
    descriptionKey: "forestDesc",
    sidebarGradient: "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)",
    light: {
      "--background": "#f0fdf4",
      "--surface": "#f7fef9",
      "--accent": "#059669",
      "--accent-foreground": "#ffffff",
      "--sidebar": "#ecfdf5",
      "--sidebar-active-foreground": "#047857",
      "--sidebar-active": "#ffffff",
    },
    dark: {
      "--background": "#052e16",
      "--surface": "#0a2e1a",
      "--accent": "#34d399",
      "--accent-foreground": "#064e3b",
      "--sidebar": "#071f12",
      "--sidebar-active-foreground": "#6ee7b7",
      "--sidebar-active": "#14532d",
    },
  },
  {
    id: "sunset",
    nameKey: "sunset",
    descriptionKey: "sunsetDesc",
    sidebarGradient: "linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fbbf24 100%)",
    light: {
      "--background": "#fff7ed",
      "--surface": "#fffcf5",
      "--accent": "#ea580c",
      "--accent-foreground": "#ffffff",
      "--sidebar": "#ffedd5",
      "--sidebar-active-foreground": "#c2410c",
      "--sidebar-active": "#ffffff",
    },
    dark: {
      "--background": "#1c0a00",
      "--surface": "#2a1208",
      "--accent": "#fb923c",
      "--accent-foreground": "#431407",
      "--sidebar": "#1a0f06",
      "--sidebar-active-foreground": "#fdba74",
      "--sidebar-active": "#7c2d12",
    },
  },
  {
    id: "midnight",
    nameKey: "midnight",
    descriptionKey: "midnightDesc",
    sidebarGradient: "linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%)",
    light: {
      "--background": "#f5f3ff",
      "--surface": "#faf9ff",
      "--accent": "#4f46e5",
      "--accent-foreground": "#ffffff",
      "--sidebar": "#ede9fe",
      "--sidebar-active-foreground": "#4338ca",
      "--sidebar-active": "#ffffff",
    },
    dark: {
      "--background": "#0f0a1e",
      "--surface": "#1a1433",
      "--accent": "#818cf8",
      "--accent-foreground": "#1e1b4b",
      "--sidebar": "#120e24",
      "--sidebar-active-foreground": "#a5b4fc",
      "--sidebar-active": "#312e81",
    },
  },
  {
    id: "rose",
    nameKey: "rose",
    descriptionKey: "roseDesc",
    sidebarGradient: "linear-gradient(135deg, #be185d 0%, #db2777 50%, #f472b6 100%)",
    light: {
      "--background": "#fdf2f8",
      "--surface": "#fffafd",
      "--accent": "#db2777",
      "--accent-foreground": "#ffffff",
      "--sidebar": "#fce7f3",
      "--sidebar-active-foreground": "#be185d",
      "--sidebar-active": "#ffffff",
    },
    dark: {
      "--background": "#1a0510",
      "--surface": "#2a0a1a",
      "--accent": "#f472b6",
      "--accent-foreground": "#500724",
      "--sidebar": "#1f0814",
      "--sidebar-active-foreground": "#fbcfe8",
      "--sidebar-active": "#831843",
    },
  },
];

export const DEFAULT_DESIGN_PRESET: DesignPresetId = "default";

export const DEFAULT_BACKGROUND_BLUR_PX = 8;

export function getDesignPreset(id: string): DesignPreset {
  return (
    DESIGN_PRESETS.find((p) => p.id === id) ??
    DESIGN_PRESETS.find((p) => p.id === "default")!
  );
}

export function applyDesignPresetToDocument(
  presetId: DesignPresetId,
  isDark: boolean,
) {
  if (typeof document === "undefined") return;
  const preset = getDesignPreset(presetId);
  document.documentElement.dataset.design = presetId;

  const vars = isDark ? preset.dark : preset.light;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  if (preset.sidebarGradient) {
    root.style.setProperty("--sidebar-gradient", preset.sidebarGradient);
  } else {
    root.style.removeProperty("--sidebar-gradient");
  }
}

export function clampBackgroundBlur(px: number): number {
  return Math.min(24, Math.max(0, Math.round(px)));
}
