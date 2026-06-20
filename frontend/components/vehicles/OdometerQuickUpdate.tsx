"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import {
  updateOdometerAction,
  type OdometerActionResult,
} from "@/lib/actions/odometer";

type OdometerQuickUpdateProps = {
  vehicleId: string;
  currentKm: number;
  locale: string;
  compact?: boolean;
};

export function OdometerQuickUpdate({
  vehicleId,
  currentKm,
  locale,
  compact = false,
}: OdometerQuickUpdateProps) {
  const t = useTranslations("vehicles.odometer");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<
    OdometerActionResult | null,
    FormData
  >(updateOdometerAction, null);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state?.ok, router]);

  if (compact && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm transition hover:border-accent/40"
      >
        <span className="tabular-nums font-semibold text-foreground">
          {currentKm.toLocaleString(locale)} km
        </span>
        <span className="text-xs text-accent opacity-0 transition group-hover:opacity-100">
          {t("update")}
        </span>
      </button>
    );
  }

  return (
    <div className={compact ? "mt-2" : ""}>
      {state?.error ? (
        <Alert variant="error">{t(`errors.${state.error}` as "errors.unknown")}</Alert>
      ) : null}
      {state?.ok ? (
        <Alert variant="success">{t("saved")}</Alert>
      ) : null}
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <div className="space-y-1">
          <Label htmlFor={`odometer-${vehicleId}`}>{t("label")}</Label>
          <Input
            id={`odometer-${vehicleId}`}
            name="currentOdometerKm"
            type="number"
            min={0}
            required
            defaultValue={currentKm}
            className="w-36"
          />
        </div>
        <Button type="submit" className="px-3 py-1.5 text-xs" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        {compact ? (
          <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
        ) : null}
      </form>
    </div>
  );
}
