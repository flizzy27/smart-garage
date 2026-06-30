"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ScheduleIntervalForm } from "@/components/maintenance/ScheduleIntervalForm";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { SerializedSchedule } from "@/lib/repositories/maintenance";

type Props = {
  schedule: SerializedSchedule;
  locale: "en" | "de";
};

export function ScheduleDetailAdjust({ schedule, locale }: Props) {
  const t = useTranslations("maintenance");
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("adjustService")}</h2>
          <p className="text-xs text-muted-foreground">{t("adjustServiceHint")}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 px-3 py-1.5 text-xs"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? t("hideDetails") : t("adjustService")}
        </Button>
      </CardHeader>
      {open ? (
        <CardContent className="pt-0">
          <ScheduleIntervalForm
            schedule={schedule}
            locale={locale}
            onSaved={() => setOpen(false)}
          />
        </CardContent>
      ) : null}
    </Card>
  );
}
