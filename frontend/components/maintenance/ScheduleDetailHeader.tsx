import { getTranslations } from "next-intl/server";
import { formatIntervalLabel } from "@/lib/maintenance/display";
import type { SerializedSchedule } from "@/lib/repositories/maintenance";
import {
  MAINTENANCE_STATUS_CARD_CLASS,
  MAINTENANCE_STATUS_TEXT_CLASS,
} from "@/lib/maintenance/status-style";

type Props = {
  schedule: SerializedSchedule;
  recordCount: number;
  locale: string;
};

export async function ScheduleDetailHeader({ schedule, recordCount, locale }: Props) {
  const t = await getTranslations("maintenance");
  const tDetail = await getTranslations("maintenance.detail");

  return (
    <section
      className={`rounded-xl border p-5 shadow-sm ${MAINTENANCE_STATUS_CARD_CLASS[schedule.dueStatus]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {schedule.vehicleName}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {schedule.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`categories.${schedule.category}`)} ·{" "}
            {formatIntervalLabel(
              schedule.intervalKm,
              schedule.intervalMonths,
              locale as "en" | "de",
            )}
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-sm font-bold ${MAINTENANCE_STATUS_TEXT_CLASS[schedule.dueStatus]}`}
          >
            {t(`status.${schedule.dueStatus}`)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {schedule.dueInDays != null
              ? t("dueInDays", { days: schedule.dueInDays })
              : schedule.dueInKm != null
                ? t("dueInKm", { km: schedule.dueInKm })
                : "—"}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 border-t border-border/60 pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">{tDetail("lastService")}</dt>
          <dd className="font-medium text-foreground">
            {schedule.lastPerformedAt
              ? new Date(schedule.lastPerformedAt).toLocaleDateString()
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{tDetail("lastOdometer")}</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {schedule.lastOdometerKm != null
              ? `${schedule.lastOdometerKm.toLocaleString()} km`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{tDetail("entries")}</dt>
          <dd className="font-medium text-foreground">
            {tDetail("entryCount", { count: recordCount })}
          </dd>
        </div>
      </dl>
    </section>
  );
}
