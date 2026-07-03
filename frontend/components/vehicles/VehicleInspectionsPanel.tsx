"use client";

import { useActionState, useState } from "react";
import type { InspectionType } from "@prisma/client";
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

function dateValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

export function VehicleInspectionsPanel({ vehicleId, inspections }: Props) {
  const t = useTranslations("vehicles.inspections");
  const router = useRouter();
  const boundAction = saveInspectionAction.bind(null, vehicleId);
  const [editingType, setEditingType] = useState<InspectionType | "new" | null>(null);
  const [state, action, pending] = useActionState(async (
    prev: { ok: boolean; error?: string } | null,
    formData: FormData,
  ) => {
    const result = await boundAction(prev, formData);
    if (result.ok) {
      setEditingType(null);
      router.refresh();
    }
    return result;
  }, null);

  const sorted = ["HU", "AU"].map((type) =>
    inspections.find((inspection) => inspection.type === type),
  );
  const editingInspection =
    editingType && editingType !== "new"
      ? inspections.find((inspection) => inspection.type === editingType)
      : null;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {state?.error ? (
          <Alert variant="error">{t(`errors.${state.error}` as "errors.unknown")}</Alert>
        ) : null}
        {state?.ok ? <Alert variant="success">{t("saved")}</Alert> : null}

        <div className="space-y-2">
          {sorted.map((insp, index) =>
            insp ? (
              <div
                key={insp.id}
                className="rounded-lg border border-border bg-muted/20 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-foreground">{t(`types.${insp.type}`)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("due")}: {new Date(insp.nextDueAt).toLocaleDateString()}
                      {insp.stickerNumber ? ` - ${insp.stickerNumber}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => setEditingType(editingType === insp.type ? null : insp.type)}
                    >
                      {t("edit")}
                    </Button>
                    <form action={deleteInspectionFormAction}>
                      <input type="hidden" name="inspectionId" value={insp.id} />
                      <input type="hidden" name="vehicleId" value={vehicleId} />
                      <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                        {t("remove")}
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={index}
                className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">
                  {t(`types.${index === 0 ? "HU" : "AU"}`)}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  onClick={() => setEditingType(index === 0 ? "HU" : "AU")}
                >
                  {t("add")}
                </Button>
              </div>
            ),
          )}
        </div>

        {editingType ? (
          <form action={action} className="space-y-3 rounded-lg border border-border bg-card p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="insp-type">{t("type")}</Label>
                <Select
                  id="insp-type"
                  name="type"
                  defaultValue={editingInspection?.type ?? (editingType === "new" ? "HU" : editingType)}
                  required
                >
                  <option value="HU">{t("types.HU")}</option>
                  <option value="AU">{t("types.AU")}</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="nextDueAt" required>{t("nextDue")}</Label>
                <Input
                  id="nextDueAt"
                  name="nextDueAt"
                  type="date"
                  required
                  defaultValue={dateValue(editingInspection?.nextDueAt)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastPerformedAt">{t("lastDone")}</Label>
                <Input
                  id="lastPerformedAt"
                  name="lastPerformedAt"
                  type="date"
                  defaultValue={dateValue(editingInspection?.lastPerformedAt)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reminderWeeksBefore">{t("reminderWeeks")}</Label>
                <Input
                  id="reminderWeeksBefore"
                  name="reminderWeeksBefore"
                  type="number"
                  min={1}
                  max={52}
                  defaultValue={editingInspection?.reminderWeeksBefore ?? 4}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="stickerNumber">{t("sticker")}</Label>
                <Input
                  id="stickerNumber"
                  name="stickerNumber"
                  defaultValue={editingInspection?.stickerNumber ?? ""}
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingType(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="px-3 py-1.5 text-xs" disabled={pending}>
                {pending ? t("saving") : t("save")}
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
