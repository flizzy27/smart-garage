"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useInstallPrompt } from "@/providers/InstallPromptProvider";

function InstructionGroup({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

export function InstallAppSettings() {
  const t = useTranslations("pages.settings.install");
  const { isStandalone, canInstall, promptInstall } = useInstallPrompt();
  const [status, setStatus] = useState<"idle" | "dismissed">("idle");

  if (isStandalone) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-success" aria-hidden>
          ✓
        </span>
        {t("alreadyInstalled")}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {canInstall && (
        <div>
          <button
            type="button"
            onClick={async () => {
              const outcome = await promptInstall();
              if (outcome === "dismissed") setStatus("dismissed");
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm transition-colors hover:opacity-90"
          >
            {t("installButton")}
          </button>
          {status === "dismissed" && (
            <p className="mt-2 text-xs text-muted-foreground">{t("dismissedHint")}</p>
          )}
        </div>
      )}

      <InstructionGroup
        title={t("iosTitle")}
        steps={[t("iosStep1"), t("iosStep2"), t("iosStep3")]}
      />
      <InstructionGroup
        title={t("androidTitle")}
        steps={[t("androidStep1"), t("androidStep2")]}
      />
      <InstructionGroup
        title={t("desktopTitle")}
        steps={[t("desktopStep1"), t("desktopStep2")]}
      />
    </div>
  );
}
