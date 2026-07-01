"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import {
  MaintenanceItemsEditor,
  itemsFromSerialized,
  type EditableMaintenanceItem,
} from "@/components/maintenance/MaintenanceItemsEditor";
import { MarkdownEditor } from "@/components/notes/MarkdownEditor";
import {
  updateMaintenanceRecordAction,
  type MaintenanceActionResult,
} from "@/lib/actions/maintenance";
import { suggestedCategoriesForTemplateSlug } from "@/lib/maintenance/item-categories";
import type { SerializedMaintenanceRecord } from "@/lib/repositories/maintenance-records";

type EditMaintenanceRecordDialogProps = {
  record: SerializedMaintenanceRecord;
  open: boolean;
  onClose: () => void;
};

export function EditMaintenanceRecordDialog({
  record,
  open,
  onClose,
}: EditMaintenanceRecordDialogProps) {
  const t = useTranslations("maintenance");
  const router = useRouter();
  const [items, setItems] = useState<EditableMaintenanceItem[]>(() =>
    itemsFromSerialized(record.items),
  );
  const [state, formAction, pending] = useActionState<
    MaintenanceActionResult | null,
    FormData
  >(async (prev, formData) => {
    const result = await updateMaintenanceRecordAction(prev, formData);
    if (result.ok) {
      router.refresh();
      onClose();
    }
    return result;
  }, null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("editRecord")}
      description={record.serviceName}
      size="xl"
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="recordId" value={record.id} />
        <input type="hidden" name="vehicleId" value={record.vehicleId} />
        {record.scheduleId ? (
          <input type="hidden" name="scheduleId" value={record.scheduleId} />
        ) : null}

        {state?.error ? <Alert variant="error">{state.error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-performedAt" required>
              {t("performedAt")}
            </Label>
            <Input
              id="edit-performedAt"
              name="performedAt"
              type="date"
              required
              defaultValue={record.performedAt.slice(0, 10)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-odometer">{t("odometer")}</Label>
            <Input
              id="edit-odometer"
              name="odometerKm"
              type="number"
              min={0}
              defaultValue={record.odometerKm ?? undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-cost">{t("cost")}</Label>
            <Input
              id="edit-cost"
              name="costEuros"
              type="number"
              min={0}
              step="0.01"
              defaultValue={record.costCents > 0 ? (record.costCents / 100).toFixed(2) : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-vendor">{t("vendor")}</Label>
            <Input id="edit-vendor" name="vendorName" defaultValue={record.vendorName ?? undefined} />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border-subtle bg-muted/30 p-3">
          <h4 className="text-sm font-semibold text-foreground">{t("items.title")}</h4>
          <MaintenanceItemsEditor
            items={items}
            onChange={setItems}
            suggestedCategories={suggestedCategoriesForTemplateSlug(record.templateSlug)}
            idPrefix="edit-item"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-note">{t("note")}</Label>
          <MarkdownEditor id="edit-note" name="note" rows={4} defaultValue={record.note} />
        </div>

        {record.scheduleId ? (
          <label className="flex min-h-[24px] items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="saveAsDefault"
              value="true"
              className="h-4 w-4 rounded border-border accent-[var(--accent)]"
            />
            {t("saveAsDefault")}
          </label>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("cancelAdd")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
