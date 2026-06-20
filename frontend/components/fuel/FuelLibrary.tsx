"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  createFuelEntryAction,
  deleteFuelEntryAction,
  type FuelActionResult,
} from "@/lib/actions/fuel";
import { formatEuros } from "@/lib/money";
import type { SerializedFuelEntry } from "@/lib/repositories/fuel";

type VehicleOption = { id: string; label: string };

type Props = {
  entries: SerializedFuelEntry[];
  vehicles: VehicleOption[];
  defaultVehicleId?: string;
};

export function FuelLibrary({ entries, vehicles, defaultVehicleId }: Props) {
  const t = useTranslations("fuel");
  const locale = useLocale();
  const [createState, createAction, creating] = useActionState<
    FuelActionResult | null,
    FormData
  >(createFuelEntryAction, null);
  const [deleteState, deleteAction] = useActionState<
    FuelActionResult | null,
    FormData
  >(deleteFuelEntryAction, null);

  return (
    <div className="space-y-6">
      <form
        action={createAction}
        className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("addTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("addHint")}</p>
        </div>

        {createState?.error ? <Alert variant="error">{createState.error}</Alert> : null}
        {createState?.ok ? <Alert variant="success">{t("added")}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fuel-vehicle" required>
              {t("vehicle")}
            </Label>
            <Select
              id="fuel-vehicle"
              name="vehicleId"
              required
              defaultValue={defaultVehicleId ?? vehicles[0]?.id ?? ""}
            >
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuel-date" required>
              {t("date")}
            </Label>
            <Input
              id="fuel-date"
              name="filledAt"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuel-liters">{t("liters")}</Label>
            <Input id="fuel-liters" name="liters" type="number" min={0} step="0.01" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuel-amount" required>
              {t("amount")}
            </Label>
            <Input
              id="fuel-amount"
              name="amountEuros"
              type="number"
              min={0}
              step="0.01"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuel-odometer">{t("odometer")}</Label>
            <Input id="fuel-odometer" name="odometerKm" type="number" min={0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuel-station">{t("station")}</Label>
            <Input id="fuel-station" name="stationName" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fuel-note">{t("note")}</Label>
            <Textarea id="fuel-note" name="note" rows={2} />
          </div>
        </div>
        <Button type="submit" disabled={creating}>
          {creating ? t("saving") : t("save")}
        </Button>
      </form>

      {deleteState?.ok ? <Alert variant="success">{t("deleted")}</Alert> : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("listTitle")}</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {entry.stationName || t("fillUp")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.vehicleName} · {new Date(entry.filledAt).toLocaleDateString()}
                    {entry.liters != null ? ` · ${entry.liters} L` : ""}
                    {entry.liters != null && entry.liters > 0
                      ? ` · ${(entry.totalCostCents / 100 / entry.liters).toFixed(3)} €/L`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatEuros(entry.totalCostCents, locale, entry.currency)}
                  </span>
                  <form action={deleteAction}>
                    <input type="hidden" name="entryId" value={entry.id} />
                    <Button type="submit" variant="ghost" className="h-8 px-2 text-xs">
                      {t("delete")}
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
