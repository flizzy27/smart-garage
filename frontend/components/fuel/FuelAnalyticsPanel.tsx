"use client";

import { useLocale, useTranslations } from "next-intl";
import type { FuelAnalytics } from "@/lib/fuel/analytics";
import { formatEuros } from "@/lib/money";
import { KM_PER_MILE, formatDistance } from "@/lib/regional/distance";
import {
  consumptionUnitLabel,
  convertConsumption,
  formatVolumeValue,
  pricePerVolumeUnit,
  volumeUnitLabel,
} from "@/lib/regional/volume";
import { useUserSettings } from "@/providers/UserSettingsProvider";
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
  const { settings } = useUserSettings();
  const { distanceUnit, volumeUnit } = settings;
  const volumeLabel = volumeUnitLabel(volumeUnit);
  const consumptionLabel = consumptionUnitLabel(distanceUnit, volumeUnit);
  // Cost figures are computed per 100 km; scale them to 100 mi when the user
  // reads distances in miles so the tile matches its own label.
  const costPer100PreferredDistance = (cents: number) =>
    distanceUnit === "mi" ? cents * KM_PER_MILE : cents;

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

  // Chart values are stored metric; convert once here so the axis label and the
  // plotted numbers can never drift apart.
  const priceChartData = priceHistory.map((point) => ({
    ...point,
    value: pricePerVolumeUnit(point.value, volumeUnit),
  }));
  const consumptionChartData = consumptionHistory.map((point) => ({
    ...point,
    value: convertConsumption(point.value, distanceUnit, volumeUnit).value,
  }));

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
              ? `${formatVolumeValue(projectedAnnualLiters, locale, volumeUnit, 0)} ${volumeLabel}`
              : "—"
          }
          detail={
            projectedAnnualCostCents != null
              ? t("projectedAnnualCost", {
                  cost: formatEuros(
                    projectedAnnualCostCents,
                    locale,
                    settings.currency,
                  ),
                })
              : projectedAnnualKm != null
                ? t("projectedAnnualKm", {
                    km: formatDistance(
                      projectedAnnualKm,
                      locale,
                      settings.distanceUnit,
                    ),
                  })
                : t("needsMoreData")
          }
        />
        <StatTile
          label={t("avgConsumption", { unit: consumptionLabel })}
          value={
            avgConsumptionLPer100Km != null
              ? `${convertConsumption(
                  avgConsumptionLPer100Km,
                  distanceUnit,
                  volumeUnit,
                ).value.toFixed(1)} ${consumptionLabel}`
              : "—"
          }
          detail={
            segments.length > 0
              ? t("basedOnSegments", { count: segments.length })
              : t("needsOdometer")
          }
        />
        <StatTile
          label={t("avgPrice", { unit: volumeLabel })}
          value={
            avgPricePerLiter != null
              ? formatEuros(
                  pricePerVolumeUnit(avgPricePerLiter, volumeUnit) * 100,
                  locale,
                  settings.currency,
                )
              : "—"
          }
        />
        <StatTile
          label={t("totalCost")}
          value={formatEuros(totalCostCents, locale, settings.currency)}
          detail={t("totalVolume", {
            volume: formatVolumeValue(totalLiters, locale, volumeUnit, 1),
            unit: volumeLabel,
          })}
        />
        <StatTile
          label={t("costPerDistance", { unit: distanceUnit })}
          value={
            avgCostPer100KmCents != null
              ? formatEuros(
                  costPer100PreferredDistance(avgCostPer100KmCents),
                  locale,
                  settings.currency,
                )
              : "—"
          }
          detail={
            totalDistanceKm > 0
              ? t("distanceTracked", {
                  km: formatDistance(totalDistanceKm, locale, distanceUnit),
                })
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader bordered={false} className="pb-2">
            <h3 className="text-sm font-medium text-foreground">
              {t("priceChart", { unit: volumeLabel })}
            </h3>
          </CardHeader>
          <CardContent className="pt-0">
            {priceChartData.length >= 2 ? (
              <FuelLineChart
                data={priceChartData}
                unit={` ${settings.currency}/${volumeLabel}`}
              />
            ) : (
              <p className="text-xs text-muted-foreground">{t("needsMoreData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader bordered={false} className="pb-2">
            <h3 className="text-sm font-medium text-foreground">
              {t("consumptionChart", { unit: consumptionLabel })}
            </h3>
          </CardHeader>
          <CardContent className="pt-0">
            {consumptionChartData.length > 0 ? (
              <FuelBarChart
                data={consumptionChartData}
                unit={` ${consumptionLabel}`}
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
              <FuelBarChart data={monthlyCostHistory} unit={` ${settings.currency}`} />
            ) : (
              <p className="text-xs text-muted-foreground">{t("needsMoreData")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
