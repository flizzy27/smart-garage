"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createFuelEntryAction, type FuelActionResult } from "@/lib/actions/fuel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { IconExpenses } from "@/components/layout/NavIcons";

type VehicleOption = { id: string; label: string };

type Props = {
  vehicles: VehicleOption[];
  defaultVehicleId?: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const OPEN_STATE_KEY = "smart-garage-quickfuel-open";

export function FuelQuickAdd({ vehicles, defaultVehicleId }: Props) {
  const t = useTranslations("dashboard.fuelQuickAdd");
  const [amount, setAmount] = useState("100");
  const [pricePerLiter, setPricePerLiter] = useState("1.8");
  // Collapsed by default; the user's per-device choice is remembered so it never
  // becomes annoying to keep re-opening or re-closing.
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    FuelActionResult | null,
    FormData
  >(createFuelEntryAction, null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read cached choice after mount to avoid hydration mismatch
      setOpen(localStorage.getItem(OPEN_STATE_KEY) === "1");
    } catch {}
  }, []);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(OPEN_STATE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const liters = useMemo(() => {
    const euros = parseFloat(amount.replace(",", "."));
    const price = parseFloat(pricePerLiter.replace(",", "."));
    if (Number.isNaN(euros) || Number.isNaN(price) || price <= 0) return "";
    return (euros / price).toFixed(2);
  }, [amount, pricePerLiter]);

  if (vehicles.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <IconExpenses className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("hint")}</p>
        </div>
        <svg
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8l4 4 4-4" />
        </svg>
      </button>

      {!open ? null : (
      <div className="mt-4">
      {state?.error ? (
        <div className="mb-4">
          <Alert variant="error">{state.error}</Alert>
        </div>
      ) : null}
      {state?.ok ? (
        <div className="mb-4">
          <Alert variant="success">{t("saved")}</Alert>
        </div>
      ) : null}

      <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input type="hidden" name="filledAt" value={todayIsoDate()} />
        <input type="hidden" name="liters" value={liters} />

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="quick-fuel-vehicle" required>
            {t("vehicle")}
          </Label>
          <Select
            id="quick-fuel-vehicle"
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

        <div className="space-y-1.5">
          <Label htmlFor="quick-fuel-amount" required>
            {t("amount")}
          </Label>
          <Input
            id="quick-fuel-amount"
            name="amountEuros"
            type="number"
            min={0}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quick-fuel-price" required>
            {t("pricePerLiter")}
          </Label>
          <Input
            id="quick-fuel-price"
            type="number"
            min={0}
            step="0.001"
            required
            value={pricePerLiter}
            onChange={(e) => setPricePerLiter(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quick-fuel-liters">{t("liters")}</Label>
          <Input
            id="quick-fuel-liters"
            type="text"
            readOnly
            value={liters ? `${liters} L` : "—"}
            className="bg-muted/50 text-muted-foreground"
          />
        </div>

        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <Button type="submit" className="w-full" disabled={pending || !liters}>
            {pending ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
      </div>
      )}
    </div>
  );
}
