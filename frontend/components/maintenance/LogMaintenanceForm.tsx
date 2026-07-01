"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MaintenanceItemCategory } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  MaintenanceItemsEditor,
  itemsFromSerialized,
  type EditableMaintenanceItem,
} from "@/components/maintenance/MaintenanceItemsEditor";
import { MarkdownEditor } from "@/components/notes/MarkdownEditor";
import {
  logMaintenanceAction,
  type MaintenanceActionResult,
} from "@/lib/actions/maintenance";
import type { SerializedMaintenanceItem } from "@/lib/repositories/maintenance-items";

type LogMaintenanceFormProps = {
  scheduleId: string;
  vehicleId: string;
  defaultOdometerKm?: number | null;
  defaultItems?: SerializedMaintenanceItem[];
  defaultNote?: string | null;
  suggestedCategories?: MaintenanceItemCategory[];
  idPrefix?: string;
};

export function LogMaintenanceForm({
  scheduleId,
  vehicleId,
  defaultOdometerKm,
  defaultItems = [],
  defaultNote,
  suggestedCategories = [],
  idPrefix = "log",
}: LogMaintenanceFormProps) {
  const t = useTranslations("maintenance");
  const router = useRouter();
  const [items, setItems] = useState<EditableMaintenanceItem[]>(() =>
    itemsFromSerialized(defaultItems),
  );
  const [state, formAction, pending] = useActionState<
    MaintenanceActionResult | null,
    FormData
  >(async (prev, formData) => {
    const result = await logMaintenanceAction(prev, formData);
    if (result.ok) router.refresh();
    return result;
  }, null);

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
      </div>

      <div className="space-y-2 rounded-lg border border-border-subtle bg-card/60 p-3">
        <h4 className="text-sm font-semibold text-foreground">{t("items.title")}</h4>
        <p className="text-xs text-muted-foreground">{t("items.hint")}</p>
        <MaintenanceItemsEditor
          items={items}
          onChange={setItems}
          suggestedCategories={suggestedCategories}
          idPrefix={`${idPrefix}-item`}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-note`}>{t("note")}</Label>
        <MarkdownEditor
          id={`${idPrefix}-note`}
          name="note"
          rows={4}
          defaultValue={defaultNote}
          placeholder={t("notePlaceholder")}
        />
      </div>

      <label className="flex min-h-[24px] items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="saveAsDefault"
          value="true"
          className="h-4 w-4 rounded border-border accent-[var(--accent)]"
        />
        {t("saveAsDefault")}
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("logService")}
      </Button>
    </form>
  );
}
