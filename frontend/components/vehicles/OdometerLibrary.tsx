"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { FuelBarChart, FuelLineChart } from "@/components/fuel/FuelCharts";
import {
  deleteOdometerReadingAction,
  logOdometerReadingAction,
  type OdometerActionResult,
} from "@/lib/actions/odometer";
import type { OdometerAnalytics } from "@/lib/fuel/odometer-analytics";
import type { SerializedOdometerLog } from "@/lib/repositories/odometer";
import {
  distanceUnitLabel,
  formatDistance,
  kmToPreferred,
} from "@/lib/regional/distance";
import { useUserSettings } from "@/providers/UserSettingsProvider";

type Props = {
  logs: SerializedOdometerLog[];
  analytics: OdometerAnalytics;
  vehicles: { id: string; label: string }[];
  defaultVehicleId?: string;
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
      {detail ? <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

/**
 * Odometer log + charts (issue #6). Distances are stored in kilometres and
 * converted here, so the whole page follows the user's distance preference.
 */
export function OdometerLibrary({
  logs,
  analytics,
  vehicles,
  defaultVehicleId,
}: Props) {
  const t = useTranslations("odometer");
  const locale = useLocale();
  const { settings } = useUserSettings();
  const distanceUnit = settings.distanceUnit;
  const unitLabel = distanceUnitLabel(distanceUnit);

  const [createState, createAction, creating] = useActionState<
    OdometerActionResult | null,
    FormData
  >(logOdometerReadingAction, null);
  const [deleteState, deleteAction] = useActionState<
    OdometerActionResult | null,
    FormData
  >(deleteOdometerReadingAction, null);

  const toPreferred = (km: number) => kmToPreferred(km, distanceUnit);
  const readingChart = analytics.readingHistory.map((point) => ({
    ...point,
    value: toPreferred(point.value),
  }));
  const monthlyChart = analytics.monthlyDistanceHistory.map((point) => ({
    ...point,
    value: toPreferred(point.value),
  }));

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

        {createState?.error ? (
          <Alert variant="error">{t("errors.failed")}</Alert>
        ) : null}
        {createState?.ok ? <Alert variant="success">{t("added")}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="distanceUnit" value={distanceUnit} />
          <div className="space-y-2">
            <Label htmlFor="odometer-vehicle" required>
              {t("vehicle")}
            </Label>
            <Select
              id="odometer-vehicle"
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
            <Label htmlFor="odometer-date" required>
              {t("date")}
            </Label>
            <Input
              id="odometer-date"
              name="recordedAt"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="odometer-value" required>
              {t("reading")} ({unitLabel})
            </Label>
            <Input
              id="odometer-value"
              name="odometerKm"
              type="number"
              min={0}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="odometer-note">{t("note")}</Label>
            <Textarea id="odometer-note" name="note" rows={1} />
          </div>
        </div>
        <Button type="submit" disabled={creating || vehicles.length === 0}>
          {creating ? t("saving") : t("save")}
        </Button>
      </form>

      {analytics.totalEntries > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("stats.latest")}
              value={
                analytics.latestReadingKm != null
                  ? formatDistance(analytics.latestReadingKm, locale, distanceUnit)
                  : "—"
              }
              detail={
                analytics.latestReadingAt
                  ? new Date(analytics.latestReadingAt).toLocaleDateString(locale)
                  : undefined
              }
            />
            <StatTile
              label={t("stats.tracked")}
              value={formatDistance(analytics.trackedDistanceKm, locale, distanceUnit)}
              detail={t("stats.trackedDetail", { count: analytics.totalEntries })}
            />
            <StatTile
              label={t("stats.perMonth")}
              value={
                analytics.avgKmPerMonth != null
                  ? formatDistance(analytics.avgKmPerMonth, locale, distanceUnit)
                  : "—"
              }
              detail={
                analytics.avgKmPerDay != null
                  ? t("stats.perDay", {
                      distance: formatDistance(
                        analytics.avgKmPerDay,
                        locale,
                        distanceUnit,
                      ),
                    })
                  : t("stats.needsMore")
              }
            />
            <StatTile
              label={t("stats.projectedAnnual")}
              value={
                analytics.projectedAnnualKm != null
                  ? formatDistance(analytics.projectedAnnualKm, locale, distanceUnit)
                  : "—"
              }
              detail={
                analytics.projectedAnnualKm == null ? t("stats.needsMore") : undefined
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader bordered={false} className="pb-2">
                <h3 className="text-sm font-medium text-foreground">
                  {t("charts.readings")}
                </h3>
              </CardHeader>
              <CardContent className="pt-0">
                {readingChart.length >= 2 ? (
                  <FuelLineChart data={readingChart} unit={` ${unitLabel}`} />
                ) : (
                  <p className="text-xs text-muted-foreground">{t("stats.needsMore")}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader bordered={false} className="pb-2">
                <h3 className="text-sm font-medium text-foreground">
                  {t("charts.monthlyDistance")}
                </h3>
              </CardHeader>
              <CardContent className="pt-0">
                {monthlyChart.length > 0 ? (
                  <FuelBarChart
                    data={monthlyChart}
                    unit={` ${unitLabel}`}
                    color="var(--success)"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">{t("stats.needsMore")}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {deleteState?.ok ? <Alert variant="success">{t("deleted")}</Alert> : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("listTitle")}</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {[...logs].reverse().map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {formatDistance(log.odometerKm, locale, distanceUnit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {log.vehicleName} ·{" "}
                    {new Date(log.recordedAt).toLocaleDateString(locale)}
                    {log.note ? ` · ${log.note}` : ""}
                  </p>
                </div>
                <form action={deleteAction}>
                  <input type="hidden" name="logId" value={log.id} />
                  <Button type="submit" variant="ghost" className="h-8 px-2 text-xs">
                    {t("delete")}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
