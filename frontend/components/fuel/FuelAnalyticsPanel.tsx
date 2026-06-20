"use client";

import { useLocale, useTranslations } from "next-intl";
import type { FuelAnalytics } from "@/lib/fuel/analytics";
import { formatEuros } from "@/lib/money";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { FuelBarChart, FuelLineChart } from "./FuelCharts";

type Props = {
  analytics: FuelAnalytics;
};

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {detail ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

export function FuelAnalyticsPanel({ analytics }: Props) {
  const t = useTranslations("fuel.analytics");
  const locale = useLocale();

  const {
    totalEntries,
    totalLiters,
    totalCostCents,
    avgPricePerLiter,
    avgConsumptionLPer100Km,
    avgCostPer100KmCents,
    totalDistanceKm,
    projectedAnnualLiters,
    projectedAnnualCostCents,
    projectedAnnualKm,
    priceHistory,
    consumptionHistory,
    monthlyCostHistory,
    segments,
  } = analytics;

  if (totalEntries === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatTile
          label={t("projectedAnnual")}
          value={
            projectedAnnualLiters != null
              ? `${Math.round(projectedAnnualLiters).toLocaleString(locale)} L`
              : "—"
          }
          detail={
            projectedAnnualCostCents != null
              ? t("projectedAnnualCost", {
                  cost: formatEuros(projectedAnnualCostCents, locale),
                })
              : projectedAnnualKm != null
                ? t("projectedAnnualKm", {
                    km: Math.round(projectedAnnualKm).toLocaleString(locale),
                  })
                : t("needsMoreData")
          }
        />
        <StatTile
          label={t("avgConsumption")}
          value={
            avgConsumptionLPer100Km != null
              ? `${avgConsumptionLPer100Km.toFixed(1)} L`
              : "—"
          }
          detail={
            segments.length > 0
              ? t("basedOnSegments", { count: segments.length })
              : t("needsOdometer")
          }
        />
        <StatTile
          label={t("avgPrice")}
          value={
            avgPricePerLiter != null
              ? `${avgPricePerLiter.toFixed(3)} €`
              : "—"
          }
        />
        <StatTile
          label={t("totalCost")}
          value={formatEuros(totalCostCents, locale)}
          detail={t("totalLiters", { liters: totalLiters.toFixed(1) })}
        />
        <StatTile
          label={t("costPer100Km")}
          value={
            avgCostPer100KmCents != null
              ? formatEuros(avgCostPer100KmCents, locale)
              : "—"
          }
          detail={
            totalDistanceKm > 0
              ? t("distanceTracked", { km: totalDistanceKm.toLocaleString(locale) })
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader bordered={false} className="pb-2">
            <h3 className="text-sm font-medium text-foreground">{t("priceChart")}</h3>
          </CardHeader>
          <CardContent className="pt-0">
            {priceHistory.length >= 2 ? (
              <FuelLineChart data={priceHistory} unit=" €/L" />
            ) : (
              <p className="text-xs text-muted-foreground">{t("needsMoreData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader bordered={false} className="pb-2">
            <h3 className="text-sm font-medium text-foreground">
              {t("consumptionChart")}
            </h3>
          </CardHeader>
          <CardContent className="pt-0">
            {consumptionHistory.length > 0 ? (
              <FuelBarChart
                data={consumptionHistory}
                unit=" L/100km"
                color="var(--success)"
              />
            ) : (
              <p className="text-xs text-muted-foreground">{t("needsOdometer")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader bordered={false} className="pb-2">
            <h3 className="text-sm font-medium text-foreground">{t("costChart")}</h3>
          </CardHeader>
          <CardContent className="pt-0">
            {monthlyCostHistory.length > 0 ? (
              <FuelBarChart data={monthlyCostHistory} unit=" €" />
            ) : (
              <p className="text-xs text-muted-foreground">{t("needsMoreData")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
