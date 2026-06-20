"use client";

import { useTranslations } from "next-intl";

export function ExportSettings() {
  const t = useTranslations("pages.settings.export");

  const linkClass =
    "inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted";

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <a href="/api/export?format=json" download className={linkClass}>
        {t("downloadJson")}
      </a>
      <a href="/api/export?format=csv" download className={linkClass}>
        {t("downloadCsv")}
      </a>
    </div>
  );
}
