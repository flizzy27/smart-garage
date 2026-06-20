"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatCurrency, formatDate } from "@/lib/regional/format";
import type { SerializedMaintenanceRecord } from "@/lib/repositories/maintenance-records";

type MaintenanceHistoryTimelineProps = {
  records: SerializedMaintenanceRecord[];
  compact?: boolean;
};

export function MaintenanceHistoryTimeline({
  records,
  compact = false,
}: MaintenanceHistoryTimelineProps) {
  const t = useTranslations("history");
  const locale = useLocale();

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-0">
      {records.map((record, index) => {
        const isFirst = index === 0;
        const performedDate = new Date(record.performedAt);

        return (
          <li key={record.id} className="relative flex gap-4 pb-8 last:pb-0">
            {index < records.length - 1 ? (
              <span
                className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border"
                aria-hidden
              />
            ) : null}

            <span
              className={`relative z-10 mt-1.5 h-[22px] w-[22px] shrink-0 rounded-full border-2 ${
                isFirst
                  ? "border-accent bg-accent shadow-sm shadow-accent/30"
                  : "border-border bg-card"
              }`}
              aria-hidden
            />

            <article
              className={`min-w-0 flex-1 rounded-xl border p-4 transition ${
                isFirst
                  ? "border-accent/30 bg-accent/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {formatDate(performedDate, locale, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  {!compact ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {record.serviceName}
                      {record.vehicleName ? ` · ${record.vehicleName}` : ""}
                    </p>
                  ) : null}
                </div>
                {isFirst ? (
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                    {t("latest")}
                  </span>
                ) : null}
              </div>

              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("odometer")}</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {record.odometerKm != null
                      ? `${record.odometerKm.toLocaleString(locale)} km`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("cost")}</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {record.costCents > 0
                      ? formatCurrency(record.costCents, record.currency, locale)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("vendor")}</dt>
                  <dd className="font-medium text-foreground">
                    {record.vendorName ?? "—"}
                  </dd>
                </div>
              </dl>

              {record.note ? (
                <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {record.note}
                </p>
              ) : null}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
