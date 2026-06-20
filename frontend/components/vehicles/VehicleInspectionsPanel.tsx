"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import {
  deleteInspectionFormAction,
  saveInspectionAction,
} from "@/lib/actions/inspections";
import type { SerializedInspection } from "./VehicleDetailPanels";

type Props = {
  vehicleId: string;
  inspections: SerializedInspection[];
};

export function VehicleInspectionsPanel({ vehicleId, inspections }: Props) {
  const t = useTranslations("vehicles.inspections");
  const router = useRouter();
  const boundAction = saveInspectionAction.bind(null, vehicleId);
  const [state, action, pending] = useActionState(boundAction, null);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  const hu = inspections.find((i) => i.type === "HU");
  const au = inspections.find((i) => i.type === "AU");

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {state?.error ? (
          <Alert variant="error">{t(`errors.${state.error}` as "errors.unknown")}</Alert>
        ) : null}
        {state?.ok ? <Alert variant="success">{t("saved")}</Alert> : null}

        {[hu, au].filter(Boolean).map((insp) =>
          insp ? (
            <div
              key={insp.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{t(`types.${insp.type}`)}</p>
                <p className="text-xs text-muted-foreground">
                  {t("due")}: {new Date(insp.nextDueAt).toLocaleDateString()}
                </p>
              </div>
              <form action={deleteInspectionFormAction}>
                <input type="hidden" name="inspectionId" value={insp.id} />
                <input type="hidden" name="vehicleId" value={vehicleId} />
                <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                  {t("remove")}
                </Button>
              </form>
            </div>
          ) : null,
        )}

        <form action={action} className="space-y-3 border-t border-border pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="insp-type">{t("type")}</Label>
              <Select id="insp-type" name="type" defaultValue="HU" required>
                <option value="HU">{t("types.HU")}</option>
                <option value="AU">{t("types.AU")}</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="nextDueAt" required>{t("nextDue")}</Label>
              <Input id="nextDueAt" name="nextDueAt" type="date" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastPerformedAt">{t("lastDone")}</Label>
              <Input id="lastPerformedAt" name="lastPerformedAt" type="date" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reminderWeeksBefore">{t("reminderWeeks")}</Label>
              <Input
                id="reminderWeeksBefore"
                name="reminderWeeksBefore"
                type="number"
                min={1}
                max={52}
                defaultValue={4}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="stickerNumber">{t("sticker")}</Label>
              <Input id="stickerNumber" name="stickerNumber" />
            </div>
          </div>
          <Button type="submit" className="px-3 py-1.5 text-xs" disabled={pending}>
            {pending ? t("saving") : t("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
