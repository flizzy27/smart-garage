import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { FuelBarChart } from "@/components/fuel/FuelCharts";
import { formatCurrency } from "@/lib/regional/format";
import type { CostAnalytics } from "@/lib/costs/analytics";

type Props = {
  analytics: CostAnalytics;
  locale: string;
};

export async function CostDashboard({ analytics, locale }: Props) {
  const t = await getTranslations("costs");

  const chartData = analytics.monthlyTrend.map((p) => ({
    date: p.date,
    label: p.label,
    value: p.value,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("thisMonth")}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatCurrency(analytics.monthTotalCents, analytics.currency, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("twelveMonths")}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatCurrency(analytics.yearTotalCents, analytics.currency, locale)}
            </p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("vehiclesTracked")}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {analytics.byVehicle.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">{t("monthlyTrend")}</h2>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <FuelBarChart data={chartData} unit=" €" />
          ) : (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">{t("byCategory")}</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noData")}</p>
            ) : (
              analytics.byCategory.map((row) => (
                <div
                  key={row.category}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{t(`categories.${row.category}` as "categories.OTHER")}</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(row.totalCents, analytics.currency, locale)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">{t("byVehicle")}</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics.byVehicle.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noData")}</p>
            ) : (
              analytics.byVehicle.map((row) => (
                <div
                  key={row.vehicleId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">{row.name}</span>
                  <span className="ml-2 shrink-0 font-medium tabular-nums">
                    {formatCurrency(row.totalCents, analytics.currency, locale)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
