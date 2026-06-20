"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  logMaintenanceAction,
  type MaintenanceActionResult,
} from "@/lib/actions/maintenance";

type LogMaintenanceFormProps = {
  scheduleId: string;
  vehicleId: string;
  defaultOdometerKm?: number | null;
  idPrefix?: string;
};

export function LogMaintenanceForm({
  scheduleId,
  vehicleId,
  defaultOdometerKm,
  idPrefix = "log",
}: LogMaintenanceFormProps) {
  const t = useTranslations("maintenance");
  const [state, formAction, pending] = useActionState<
    MaintenanceActionResult | null,
    FormData
  >(logMaintenanceAction, null);

  return (
    <form
      id="log-service"
      action={formAction}
      className="space-y-4 rounded-xl border border-accent/30 bg-accent/5 p-5"
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t("logService")}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("logServiceHint")}</p>
      </div>

      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.ok ? <Alert variant="success">{t("serviceLogged")}</Alert> : null}

      <input type="hidden" name="scheduleId" value={scheduleId} />
      <input type="hidden" name="vehicleId" value={vehicleId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-performedAt`} required>
            {t("performedAt")}
          </Label>
          <Input
            id={`${idPrefix}-performedAt`}
            name="performedAt"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-odometer`}>{t("odometer")}</Label>
          <Input
            id={`${idPrefix}-odometer`}
            name="odometerKm"
            type="number"
            min={0}
            defaultValue={defaultOdometerKm ?? undefined}
            placeholder="km"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-cost`}>{t("cost")}</Label>
          <Input
            id={`${idPrefix}-cost`}
            name="costEuros"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-vendor`}>{t("vendor")}</Label>
          <Input id={`${idPrefix}-vendor`} name="vendorName" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-note`}>{t("note")}</Label>
          <Textarea id={`${idPrefix}-note`} name="note" rows={2} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("logService")}
      </Button>
    </form>
  );
}
