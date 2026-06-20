"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ModificationCategory } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  createModificationAction,
  deleteModificationFormAction,
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

type VehicleModificationsPanelProps = {
  vehicleId: string;
  modifications: SerializedModification[];
};

export function VehicleModificationsPanel({
  vehicleId,
  modifications,
}: VehicleModificationsPanelProps) {
  const t = useTranslations("vehicles.modifications");
  const tCat = useTranslations("vehicles.modificationCategories");
  const locale = useLocale();
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
            <li
              key={mod.id}
              className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{mod.name}</p>
                <p className="text-xs text-muted-foreground">
                  {tCat(mod.category)}
                  {mod.installedAt
                    ? ` · ${new Date(mod.installedAt).toLocaleDateString()}`
                    : ""}
                  {mod.costCents
                    ? ` · ${formatEuros(Number(mod.costCents), locale)}`
                    : ""}
                </p>
                {mod.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mod.description}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {mod.addedPowerPs != null ? (
                    <span>+{mod.addedPowerPs} PS</span>
                  ) : null}
                  {mod.addedPowerKw != null ? (
                    <span>+{mod.addedPowerKw} kW</span>
                  ) : null}
                  {mod.addedTorqueNm != null ? (
                    <span>+{mod.addedTorqueNm} Nm</span>
                  ) : null}
                </div>
              </div>
              <form
                action={deleteModificationFormAction.bind(
                  null,
                  vehicleId,
                  mod.id,
                )}
              >
                <Button
                  type="submit"
                  variant="secondary"
                  className="px-3 py-1 text-xs"
                >
                  {t("remove")}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="space-y-4 border-t border-border pt-6">
        {state && !state.success ? (
          <Alert>{t("error")}</Alert>
        ) : state?.success ? (
          <p className="text-sm text-success">{t("added")}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mod-category" required>
              {t("category")}
            </Label>
            <Select id="mod-category" name="category" required defaultValue="">
              <option value="">{t("selectCategory")}</option>
              {PRESET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {tCat(cat)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mod-name" required>
              {t("name")}
            </Label>
            <Input id="mod-name" name="name" required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="mod-description">{t("description")}</Label>
            <Input id="mod-description" name="description" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mod-installedAt">{t("installedAt")}</Label>
            <Input id="mod-installedAt" name="installedAt" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mod-cost">{t("cost")}</Label>
            <Input
              id="mod-cost"
              name="costEuros"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mod-powerPs">{t("addedPowerPs")}</Label>
            <Input id="mod-powerPs" name="addedPowerPs" type="number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mod-powerKw">{t("addedPowerKw")}</Label>
            <Input id="mod-powerKw" name="addedPowerKw" type="number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mod-torque">{t("addedTorqueNm")}</Label>
            <Input id="mod-torqueNm" name="addedTorqueNm" type="number" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="mod-notes">{t("notes")}</Label>
            <Textarea id="mod-notes" name="notes" rows={2} />
          </div>
        </div>
        <input type="hidden" name="isCustom" value="false" />
        <Button type="submit" disabled={pending}>
          {pending ? t("adding") : t("add")}
        </Button>
      </form>
    </div>
  );
}

type VehicleModificationsProps = {
  vehicleId: string;
  modifications: SerializedModification[];
};

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
