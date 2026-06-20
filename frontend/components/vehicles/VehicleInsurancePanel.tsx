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

export function VehicleInsurancePanel({
  vehicleId,
  policies,
  locale = "de",
}: Props) {
  const t = useTranslations("vehicles.insurance");
  const router = useRouter();
  const boundAction = saveInsuranceAction.bind(null, vehicleId);
  const [state, action, pending] = useActionState(boundAction, null);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {policies.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          policies.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="text-sm">
                <p className="font-medium">{p.provider}</p>
                <p className="text-xs text-muted-foreground">
                  {t(`coverage.${p.coverageType}`)}
                  {p.sfClass ? ` · SF ${p.sfClass}` : ""}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(p.premiumCents, p.currency, locale)} / {t("year")}
                  · {t("until")}{" "}
                  {new Date(p.endDate).toLocaleDateString(locale)}
                </p>
              </div>
              <form action={deleteInsuranceFormAction}>
                <input type="hidden" name="policyId" value={p.id} />
                <input type="hidden" name="vehicleId" value={vehicleId} />
                <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                  {t("remove")}
                </Button>
              </form>
            </div>
          ))
        )}

        {state?.error ? (
          <Alert variant="error">{t(`errors.${state.error}` as "errors.unknown")}</Alert>
        ) : null}

        <form action={action} className="space-y-3 border-t border-border pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="provider" required>{t("provider")}</Label>
              <Input id="provider" name="provider" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="coverageType">{t("coverageLabel")}</Label>
              <Select id="coverageType" name="coverageType" defaultValue="LIABILITY">
                <option value="LIABILITY">{t("coverage.LIABILITY")}</option>
                <option value="PARTIAL">{t("coverage.PARTIAL")}</option>
                <option value="FULL">{t("coverage.FULL")}</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sfClass">{t("sfClass")}</Label>
              <Input id="sfClass" name="sfClass" placeholder="e.g. 12" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="premiumEuros" required>{t("premium")}</Label>
              <Input id="premiumEuros" name="premiumEuros" type="number" min={0} step={0.01} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="policyNumber">{t("policyNumber")}</Label>
              <Input id="policyNumber" name="policyNumber" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="startDate" required>{t("startDate")}</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate" required>{t("endDate")}</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input id="autoRenew" name="autoRenew" type="checkbox" defaultChecked />
              <Label htmlFor="autoRenew">{t("autoRenew")}</Label>
            </div>
          </div>
          <Button type="submit" className="px-3 py-1.5 text-xs" disabled={pending}>
            {pending ? t("saving") : t("add")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
