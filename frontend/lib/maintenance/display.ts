import type { Locale } from "@/lib/i18n/routing";
import type { MaintenanceTemplate } from "@prisma/client";

export function templateDisplayName(
  template: Pick<MaintenanceTemplate, "nameEn" | "nameDe">,
  locale: Locale,
): string {
  return locale === "de" ? template.nameDe : template.nameEn;
}

export function templateDescription(
  template: Pick<MaintenanceTemplate, "descriptionEn" | "descriptionDe">,
  locale: Locale,
): string | null {
  const value = locale === "de" ? template.descriptionDe : template.descriptionEn;
  return value ?? null;
}

export function scheduleDisplayName(
  schedule: {
    customName: string | null;
    template: Pick<MaintenanceTemplate, "nameEn" | "nameDe"> | null;
  },
  locale: Locale,
): string {
  if (schedule.customName?.trim()) return schedule.customName.trim();
  if (schedule.template) return templateDisplayName(schedule.template, locale);
  return locale === "de" ? "Wartung" : "Maintenance";
}

export function formatIntervalLabel(
  intervalKm: number | null,
  intervalMonths: number | null,
  locale: Locale,
): string {
  const parts: string[] = [];
  if (intervalKm != null) {
    parts.push(
      locale === "de"
        ? `${intervalKm.toLocaleString("de-DE")} km`
        : `${intervalKm.toLocaleString("en-US")} km`,
    );
  }
  if (intervalMonths != null) {
    parts.push(
      locale === "de"
        ? `${intervalMonths} Mon.`
        : `${intervalMonths} mo.`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function formatCostRange(
  minCents: bigint | number | null,
  maxCents: bigint | number | null,
  currency: string,
  locale: Locale,
): string | null {
  if (minCents == null && maxCents == null) return null;
  const fmt = new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  const min = Number(minCents ?? maxCents);
  const max = Number(maxCents ?? minCents);
  if (min === max) return fmt.format(min / 100);
  return `${fmt.format(min / 100)} – ${fmt.format(max / 100)}`;
}
