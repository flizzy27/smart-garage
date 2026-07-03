"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency } from "@/lib/regional/format";
import {
  deleteInsuranceFormAction,
  saveInsuranceAction,
} from "@/lib/actions/insurance";
import type { SerializedInsurance } from "./VehicleDetailPanels";

type Props = {
  vehicleId: string;
  policies: SerializedInsurance[];
  locale?: string;
};

function dateValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

export function VehicleInsurancePanel({
  vehicleId,
  policies,
  locale = "de",
}: Props) {
  const t = useTranslations("vehicles.insurance");
  const router = useRouter();
  const boundAction = saveInsuranceAction.bind(null, vehicleId);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [state, action, pending] = useActionState(async (
    prev: { ok: boolean; error?: string } | null,
    formData: FormData,
  ) => {
    const result = await boundAction(prev, formData);
    if (result.ok) {
      setEditingId(null);
      router.refresh();
    }
    return result;
  }, null);
  const editingPolicy =
    editingId && editingId !== "new"
      ? policies.find((policy) => policy.id === editingId)
      : null;

  const currentPolicy = policies[0] ?? null;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {policies.length === 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2 text-sm">
            <span className="text-muted-foreground">{t("empty")}</span>
            <Button
              type="button"
              variant="secondary"
              className="px-2 py-1 text-xs"
              onClick={() => setEditingId("new")}
            >
              {t("add")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {currentPolicy ? (
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-foreground">{currentPolicy.provider}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`coverage.${currentPolicy.coverageType}`)}
                      {currentPolicy.sfClass ? ` - SF ${currentPolicy.sfClass}` : ""}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(currentPolicy.premiumCents, currentPolicy.currency, locale)} / {t("year")}
                      {" - "}
                      {t("until")} {new Date(currentPolicy.endDate).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => setEditingId(editingId === currentPolicy.id ? null : currentPolicy.id)}
                    >
                      {t("edit")}
                    </Button>
                    <form action={deleteInsuranceFormAction}>
                      <input type="hidden" name="policyId" value={currentPolicy.id} />
                      <input type="hidden" name="vehicleId" value={vehicleId} />
                      <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                        {t("remove")}
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {state?.error ? (
          <Alert variant="error">{t(`errors.${state.error}` as "errors.unknown")}</Alert>
        ) : null}

        {editingId ? (
          <form action={action} className="space-y-3 rounded-lg border border-border bg-card p-3">
            {editingPolicy ? <input type="hidden" name="policyId" value={editingPolicy.id} /> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="provider" required>{t("provider")}</Label>
                <Input id="provider" name="provider" required defaultValue={editingPolicy?.provider ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="coverageType">{t("coverageLabel")}</Label>
                <Select id="coverageType" name="coverageType" defaultValue={editingPolicy?.coverageType ?? "LIABILITY"}>
                  <option value="LIABILITY">{t("coverage.LIABILITY")}</option>
                  <option value="PARTIAL">{t("coverage.PARTIAL")}</option>
                  <option value="FULL">{t("coverage.FULL")}</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="sfClass">{t("sfClass")}</Label>
                <Input id="sfClass" name="sfClass" placeholder="12" defaultValue={editingPolicy?.sfClass ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="premiumEuros" required>{t("premium")}</Label>
                <Input
                  id="premiumEuros"
                  name="premiumEuros"
                  type="number"
                  min={0}
                  step={0.01}
                  required
                  defaultValue={editingPolicy ? (editingPolicy.premiumCents / 100).toFixed(2) : ""}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="policyNumber">{t("policyNumber")}</Label>
                <Input id="policyNumber" name="policyNumber" defaultValue={editingPolicy?.policyNumber ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="startDate" required>{t("startDate")}</Label>
                <Input id="startDate" name="startDate" type="date" required defaultValue={dateValue(editingPolicy?.startDate)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate" required>{t("endDate")}</Label>
                <Input id="endDate" name="endDate" type="date" required defaultValue={dateValue(editingPolicy?.endDate)} />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input id="autoRenew" name="autoRenew" type="checkbox" defaultChecked={editingPolicy?.autoRenew ?? true} />
                <Label htmlFor="autoRenew">{t("autoRenew")}</Label>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
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
