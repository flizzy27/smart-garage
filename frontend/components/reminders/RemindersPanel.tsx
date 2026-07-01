"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import {
  sortDueSchedules,
  sortSchedulesForSetup,
} from "@/lib/maintenance/reminder-queue";
import { formatIntervalLabel } from "@/lib/maintenance/display";
import type { SerializedSchedule } from "@/lib/repositories/maintenance";
import { ScheduleIntervalForm } from "@/components/maintenance/ScheduleIntervalForm";
import { RemindersSetupWizard } from "@/components/reminders/RemindersSetupWizard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  MAINTENANCE_STATUS_BADGE_CLASS,
  MAINTENANCE_STATUS_CARD_CLASS,
} from "@/lib/maintenance/status-style";

type Props = {
  schedules: SerializedSchedule[];
};

export function RemindersPanel({ schedules }: Props) {
  const t = useTranslations("reminders");
  const locale = useLocale() as "en" | "de";
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const setupQueue = useMemo(() => sortSchedulesForSetup(schedules), [schedules]);
  const dueItems = useMemo(() => sortDueSchedules(schedules), [schedules]);

  return (
    <div className="space-y-4">
      {setupQueue.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t("setup.prompt")}</p>
            <p className="text-xs text-muted-foreground">
              {t("setup.promptHint", { count: setupQueue.length })}
            </p>
          </div>
          <Button type="button" onClick={() => setWizardOpen(true)}>
            {t("setup.start")}
          </Button>
        </div>
      ) : null}

      <RemindersSetupWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        queue={setupQueue}
      />

      {dueItems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t("allClear")}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {dueItems.map((item) => {
            const editing = editingId === item.id;
            return (
              <li key={item.id}>
                <Card className={MAINTENANCE_STATUS_CARD_CLASS[item.dueStatus]}>
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.vehicleName}
                          {item.dueInDays != null
                            ? ` · ${t("dueInDays", { days: item.dueInDays })}`
                            : ""}
                          {item.dueInKm != null
                            ? ` · ${t("dueInKm", { km: item.dueInKm })}`
                            : ""}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatIntervalLabel(
                            item.intervalKm,
                            item.intervalMonths,
                            locale,
                          )}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${MAINTENANCE_STATUS_BADGE_CLASS[item.dueStatus]}`}
                      >
                        {item.dueStatus === "OVERDUE" ? t("overdue") : t("dueSoon")}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => setEditingId(editing ? null : item.id)}
                      >
                        {editing ? t("setup.hideIntervals") : t("setup.editIntervals")}
                      </Button>
                      <Link href={`/maintenance/${item.id}#log-service`}>
                        <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs">
                          {t("setup.logService")}
                        </Button>
                      </Link>
                    </div>

                    {editing ? (
                      <ScheduleIntervalForm
                        schedule={item}
                        locale={locale}
                        onSaved={() => setEditingId(null)}
                      />
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
