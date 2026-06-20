"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  updateScheduleAction,
  type MaintenanceActionResult,
} from "@/lib/actions/maintenance";
import { formatIntervalLabel } from "@/lib/maintenance/display";
import type { SerializedSchedule } from "@/lib/repositories/maintenance";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

type ScheduleIntervalFormProps = {
  schedule: SerializedSchedule;
  locale: "en" | "de";
  onSaved?: () => void;
};

export function ScheduleIntervalForm({
  schedule,
  locale,
  onSaved,
}: ScheduleIntervalFormProps) {
  const t = useTranslations("maintenance");
  const router = useRouter();
  const [state, action, pending] = useActionState<
    MaintenanceActionResult | null,
    FormData
  >(async (prev, formData) => {
    const result = await updateScheduleAction(prev, formData);
    if (result.ok) {
      onSaved?.();
      router.refresh();
    }
    return result;
  }, null);

  return (
    <form action={action} className="mt-3 space-y-3 rounded-lg border border-border-subtle bg-muted/30 p-3">
      <input type="hidden" name="scheduleId" value={schedule.id} />
      <input type="hidden" name="vehicleId" value={schedule.vehicleId} />
      <p className="text-xs text-muted-foreground">
        {t("editIntervals")}: {formatIntervalLabel(schedule.intervalKm, schedule.intervalMonths, locale)}
      </p>
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.ok ? <Alert variant="success">{t("scheduleUpdated")}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`interval-km-${schedule.id}`}>{t("intervalKm")}</Label>
          <Input
            id={`interval-km-${schedule.id}`}
            name="intervalKm"
            type="number"
            min={0}
            defaultValue={schedule.intervalKm ?? ""}
            placeholder="15000"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`interval-mo-${schedule.id}`}>{t("intervalMonths")}</Label>
          <Input
            id={`interval-mo-${schedule.id}`}
            name="intervalMonths"
            type="number"
            min={0}
            defaultValue={schedule.intervalMonths ?? ""}
            placeholder="12"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`last-at-${schedule.id}`}>{t("lastPerformed")}</Label>
          <Input
            id={`last-at-${schedule.id}`}
            name="lastPerformedAt"
            type="date"
            defaultValue={schedule.lastPerformedAt?.slice(0, 10) ?? ""}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`last-km-${schedule.id}`}>{t("lastOdometer")}</Label>
          <Input
            id={`last-km-${schedule.id}`}
            name="lastOdometerKm"
            type="number"
            min={0}
            defaultValue={schedule.lastOdometerKm ?? schedule.vehicleOdometerKm}
          />
        </div>
      </div>
      <Button type="submit" className="px-3 py-1.5 text-xs" disabled={pending}>
        {pending ? t("saving") : t("saveIntervals")}
      </Button>
    </form>
  );
}
