"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ModificationCategory } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  createModificationAction,
  deleteModificationAction,
  updateModificationAction,
  type ModificationActionResult,
} from "@/lib/actions/modifications";
import { formatEuros } from "@/lib/money";
import type { SerializedModification } from "@/lib/vehicles/serialize";

const PRESET_CATEGORIES = [
  ModificationCategory.STAGE_1,
  ModificationCategory.STAGE_2,
  ModificationCategory.STAGE_3,
  ModificationCategory.STAGE_4,
  ModificationCategory.INTAKE,
  ModificationCategory.INTERCOOLER,
  ModificationCategory.DOWNPIPE,
  ModificationCategory.EXHAUST,
  ModificationCategory.TURBOCHARGER,
  ModificationCategory.FUEL_PUMP_HP,
  ModificationCategory.FUEL_PUMP_LP,
  ModificationCategory.INJECTORS,
  ModificationCategory.SUSPENSION,
  ModificationCategory.BRAKES,
  ModificationCategory.WHEELS,
  ModificationCategory.ECU_TUNE,
  ModificationCategory.TRANSMISSION_TUNE,
  ModificationCategory.CUSTOM,
] as const;

type VehicleModificationsProps = {
  vehicleId: string;
  modifications: SerializedModification[];
};

/** Shared add/edit form fields, prefilled from `mod` when editing. */
function ModificationFormFields({ mod }: { mod?: SerializedModification }) {
  const t = useTranslations("vehicles.modifications");
  const tCat = useTranslations("vehicles.modificationCategories");
  const uid = useId();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${uid}-category`} required>
          {t("category")}
        </Label>
        <Select
          id={`${uid}-category`}
          name="category"
          required
          defaultValue={mod?.category ?? ""}
        >
          <option value="">{t("selectCategory")}</option>
          {PRESET_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {tCat(cat)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-name`} required>
          {t("name")}
        </Label>
        <Input id={`${uid}-name`} name="name" required defaultValue={mod?.name ?? ""} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${uid}-description`}>{t("description")}</Label>
        <Input
          id={`${uid}-description`}
          name="description"
          defaultValue={mod?.description ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-installedAt`}>{t("installedAt")}</Label>
        <Input
          id={`${uid}-installedAt`}
          name="installedAt"
          type="date"
          defaultValue={mod?.installedAt ? mod.installedAt.slice(0, 10) : ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-cost`}>{t("cost")}</Label>
        <Input
          id={`${uid}-cost`}
          name="costEuros"
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          defaultValue={
            mod?.costCents != null ? (Number(mod.costCents) / 100).toFixed(2) : ""
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-powerPs`}>{t("addedPowerPs")}</Label>
        <Input
          id={`${uid}-powerPs`}
          name="addedPowerPs"
          type="number"
          inputMode="numeric"
          defaultValue={mod?.addedPowerPs ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-powerKw`}>{t("addedPowerKw")}</Label>
        <Input
          id={`${uid}-powerKw`}
          name="addedPowerKw"
          type="number"
          inputMode="numeric"
          defaultValue={mod?.addedPowerKw ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-torque`}>{t("addedTorqueNm")}</Label>
        <Input
          id={`${uid}-torque`}
          name="addedTorqueNm"
          type="number"
          inputMode="numeric"
          defaultValue={mod?.addedTorqueNm ?? ""}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${uid}-notes`}>{t("notes")}</Label>
        <Textarea id={`${uid}-notes`} name="notes" rows={2} defaultValue={mod?.notes ?? ""} />
      </div>
      <input type="hidden" name="isCustom" value="false" />
    </div>
  );
}

function ModificationRow({
  vehicleId,
  mod,
}: {
  vehicleId: string;
  mod: SerializedModification;
}) {
  const t = useTranslations("vehicles.modifications");
  const tCat = useTranslations("vehicles.modificationCategories");
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDelete] = useTransition();

  const [state, formAction, pending] = useActionState<
    ModificationActionResult | null,
    FormData
  >(async (prev, formData) => {
    const result = await updateModificationAction(vehicleId, mod.id, prev, formData);
    if (result.success) setEditing(false);
    return result;
  }, null);

  const confirmDelete = () => {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteModificationAction(vehicleId, mod.id);
      if (!result.success) {
        setDeleteError(t("error"));
        return;
      }
      setConfirmingDelete(false);
    });
  };

  if (editing) {
    return (
      <li className="py-4 first:pt-0 last:pb-0">
        <form action={formAction} className="space-y-4">
          {state && !state.success ? <Alert>{t("error")}</Alert> : null}
          <ModificationFormFields mod={mod} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : t("save")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{mod.name}</p>
        <p className="text-xs text-muted-foreground">
          {tCat(mod.category)}
          {mod.installedAt
            ? ` · ${new Date(mod.installedAt).toLocaleDateString(locale)}`
            : ""}
          {mod.costCents ? ` · ${formatEuros(Number(mod.costCents), locale)}` : ""}
        </p>
        {mod.description ? (
          <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {mod.addedPowerPs != null ? <span>+{mod.addedPowerPs} PS</span> : null}
          {mod.addedPowerKw != null ? <span>+{mod.addedPowerKw} kW</span> : null}
          {mod.addedTorqueNm != null ? <span>+{mod.addedTorqueNm} Nm</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="secondary"
          className="px-3 py-1 text-xs"
          onClick={() => setEditing(true)}
        >
          {t("edit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="px-3 py-1 text-xs text-danger hover:bg-danger/10"
          onClick={() => setConfirmingDelete(true)}
        >
          {t("remove")}
        </Button>
      </div>

      <Dialog
        open={confirmingDelete}
        title={t("deleteTitle")}
        description={t("deleteConfirm")}
        confirmLabel={deletePending ? t("deleting") : t("confirmDelete")}
        cancelLabel={t("cancel")}
        confirmVariant="danger"
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      >
        {deleteError ? <Alert variant="error">{deleteError}</Alert> : null}
      </Dialog>
    </li>
  );
}

export function VehicleModificationsPanel({
  vehicleId,
  modifications,
}: VehicleModificationsProps) {
  const t = useTranslations("vehicles.modifications");
  const boundCreate = createModificationAction.bind(null, vehicleId);
  const [state, formAction, pending] = useActionState<
    ModificationActionResult | null,
    FormData
  >(boundCreate, null);

  return (
    <div className="space-y-6">
      {modifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {modifications.map((mod) => (
            <ModificationRow key={mod.id} vehicleId={vehicleId} mod={mod} />
          ))}
        </ul>
      )}

      <form action={formAction} className="space-y-4 border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-foreground">{t("addTitle")}</h3>
        {state && !state.success ? (
          <Alert>{t("error")}</Alert>
        ) : state?.success ? (
          <p className="text-sm text-success">{t("added")}</p>
        ) : null}

        <ModificationFormFields />

        <Button type="submit" disabled={pending}>
          {pending ? t("adding") : t("add")}
        </Button>
      </form>
    </div>
  );
}

export function VehicleModifications({
  vehicleId,
  modifications,
}: VehicleModificationsProps) {
  const t = useTranslations("vehicles.modifications");

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <VehicleModificationsPanel
          vehicleId={vehicleId}
          modifications={modifications}
        />
      </CardContent>
    </Card>
  );
}

export function VehicleModificationsButton({
  vehicleId,
  modifications,
}: VehicleModificationsProps) {
  const t = useTranslations("vehicles.modifications");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {t("open")}
        {modifications.length > 0 ? ` (${modifications.length})` : ""}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("title")}
        description={t("subtitle")}
        size="xl"
      >
        <VehicleModificationsPanel
          vehicleId={vehicleId}
          modifications={modifications}
        />
      </Modal>
    </>
  );
}
