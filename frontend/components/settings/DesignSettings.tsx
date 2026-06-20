"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAppearance } from "@/providers/AppearanceProvider";
import { DESIGN_PRESETS, type DesignPresetId } from "@/lib/theme/presets";
import { saveAppearanceSettings } from "@/lib/actions/appearance";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { useState, useTransition } from "react";

export function DesignPresetSettings() {
  const t = useTranslations("pages.settings.design");
  const { designPreset, setDesignPreset } = useAppearance();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const save = (preset: DesignPresetId) => {
    setDesignPreset(preset);
    startTransition(async () => {
      await saveAppearanceSettings({ designPreset: preset });
      router.refresh();
    });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {DESIGN_PRESETS.map((preset) => {
        const active = designPreset === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            disabled={pending}
            onClick={() => save(preset.id)}
            className={`relative overflow-hidden rounded-xl border p-4 text-left transition-all ${
              active
                ? "border-accent ring-2 ring-accent/30"
                : "border-border hover:border-accent/40"
            }`}
          >
            {preset.sidebarGradient ? (
              <div
                className="mb-3 h-2 rounded-full"
                style={{ background: preset.sidebarGradient }}
              />
            ) : (
              <div className="mb-3 h-2 rounded-full bg-accent" />
            )}
            <p className="text-sm font-semibold text-foreground">
              {t(`presets.${preset.nameKey}`)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t(`presets.${preset.descriptionKey}`)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export function BackgroundBlurSettings({ hasBackground }: { hasBackground: boolean }) {
  const t = useTranslations("pages.settings.background");
  const { backgroundBlurPx, setBackgroundBlurPx } = useAppearance();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [localBlur, setLocalBlur] = useState(backgroundBlurPx);

  if (!hasBackground) return null;

  const save = () => {
    setBackgroundBlurPx(localBlur);
    startTransition(async () => {
      await saveAppearanceSettings({ backgroundBlurPx: localBlur });
      router.refresh();
    });
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="space-y-2">
        <Label htmlFor="background-blur">{t("blurLabel")}</Label>
        <div className="flex items-center gap-4">
          <input
            id="background-blur"
            type="range"
            min={0}
            max={24}
            step={1}
            value={localBlur}
            onChange={(e) => setLocalBlur(Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="w-12 text-right text-sm tabular-nums text-muted-foreground">
            {localBlur}px
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{t("blurHint")}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="px-3 py-1.5 text-xs"
        disabled={pending || localBlur === backgroundBlurPx}
        onClick={save}
      >
        {pending ? t("savingBlur") : t("saveBlur")}
      </Button>
    </div>
  );
}
