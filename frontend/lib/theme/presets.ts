export type DesignPresetId =
  | "default"
  | "space"
  | "forest"
  | "sunset"
  | "midnight"
  | "rose"
  | "aurora"
  | "graphite"
  | "crimson";

export type DesignPreset = {
  id: DesignPresetId;
  nameKey: string;
  descriptionKey: string;
  /**
   * Preview gradient used for the swatch on the settings card. The actual
   * applied colours live in `globals.css` under `[data-design="<id>"]`
   * selectors — this keeps a single source of truth for the palette and avoids
   * leaking inline CSS variables when switching presets.
   */
  previewGradient?: string;
};

export const DESIGN_PRESETS: DesignPreset[] = [
  { id: "default", nameKey: "default", descriptionKey: "defaultDesc" },
  {
    id: "space",
    nameKey: "space",
    descriptionKey: "spaceDesc",
    previewGradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #8b5cf6 100%)",
  },
  {
    id: "forest",
    nameKey: "forest",
    descriptionKey: "forestDesc",
    previewGradient: "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)",
  },
  {
    id: "sunset",
    nameKey: "sunset",
    descriptionKey: "sunsetDesc",
    previewGradient: "linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fbbf24 100%)",
  },
  {
    id: "midnight",
    nameKey: "midnight",
    descriptionKey: "midnightDesc",
    previewGradient: "linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%)",
  },
  {
    id: "rose",
    nameKey: "rose",
    descriptionKey: "roseDesc",
    previewGradient: "linear-gradient(135deg, #be185d 0%, #db2777 50%, #f472b6 100%)",
  },
  {
    id: "aurora",
    nameKey: "aurora",
    descriptionKey: "auroraDesc",
    previewGradient: "linear-gradient(135deg, #0d9488 0%, #06b6d4 50%, #22d3ee 100%)",
  },
  {
    id: "graphite",
    nameKey: "graphite",
    descriptionKey: "graphiteDesc",
    previewGradient: "linear-gradient(135deg, #334155 0%, #64748b 50%, #94a3b8 100%)",
  },
  {
    id: "crimson",
    nameKey: "crimson",
    descriptionKey: "crimsonDesc",
    previewGradient: "linear-gradient(135deg, #9f1239 0%, #dc2626 50%, #f87171 100%)",
  },
];

export const DEFAULT_DESIGN_PRESET: DesignPresetId = "default";

export const DEFAULT_BACKGROUND_BLUR_PX = 8;
export const MAX_BACKGROUND_BLUR_PX = 50;

export function getDesignPreset(id: string): DesignPreset {
  return (
    DESIGN_PRESETS.find((p) => p.id === id) ??
    DESIGN_PRESETS.find((p) => p.id === "default")!
  );
}

/**
 * Applies a design preset by setting the `data-design` attribute on <html>.
 * All palette colours are defined in CSS via `[data-design="<id>"]` selectors,
 * so switching presets (including back to "default") is a single attribute
 * swap — no stale inline CSS variables can linger. Dark/light is handled by
 * the `.dark` class independently, so this needs no `isDark` argument.
 */
export function applyDesignPresetToDocument(presetId: DesignPresetId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.design = getDesignPreset(presetId).id;
}

export function clampBackgroundBlur(px: number): number {
  if (!Number.isFinite(px)) return DEFAULT_BACKGROUND_BLUR_PX;
  return Math.min(MAX_BACKGROUND_BLUR_PX, Math.max(0, Math.round(px)));
}
