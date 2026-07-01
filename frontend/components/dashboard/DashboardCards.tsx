import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { IconExpenses, IconMaintenance, IconVehicles } from "@/components/layout/NavIcons";
import { Card, CardContent, CardHeader, StatCard } from "@/components/ui/Card";
import { DashboardOdometerUpdate } from "@/components/vehicles/VehicleExtras";
import { formatCurrency } from "@/lib/regional/format";
import { getVehicleImageUrl } from "@/lib/vehicles/serialize";
import { getDashboardStats } from "@/lib/services/dashboard";
import type { MaintenanceDueStatus } from "@prisma/client";
import {
  MAINTENANCE_STATUS_BADGE_CLASS,
  MAINTENANCE_STATUS_CARD_CLASS,
} from "@/lib/maintenance/status-style";

export async function PrimaryVehicleCard({ locale }: { locale: string }) {
  const t = await getTranslations("dashboard.primaryVehicle");
  const { primaryVehicle, vehicleAlerts } = await getDashboardStats();

  if (!primaryVehicle) {
    return (
      <Card className="sm:col-span-2 xl:col-span-2">
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <IconVehicles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("emptyTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("emptyDescription")}</p>
          </div>
          <Link
            href="/vehicles/new"
            className="inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
          >
            {t("addVehicle")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const imageDoc = primaryVehicle.documents[0];
  const imageUrl = imageDoc ? getVehicleImageUrl(imageDoc.id) : null;
  const title = [primaryVehicle.make, primaryVehicle.model].filter(Boolean).join(" ");
  const year = primaryVehicle.productionYear ?? primaryVehicle.year;
  const power =
    primaryVehicle.currentSpecs?.powerPs ??
    primaryVehicle.factorySpecs?.powerPs;
  const fuel =
    primaryVehicle.currentSpecs?.fuelType ??
    primaryVehicle.factorySpecs?.fuelType;
  const overdueCount = vehicleAlerts.filter((a) => a.dueStatus === "OVERDUE").length;
  const dueSoonCount = vehicleAlerts.filter((a) => a.dueStatus === "DUE_SOON").length;

  return (
    <Card className="overflow-hidden sm:col-span-2 xl:col-span-2">
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        <div className="relative min-h-48 bg-muted md:min-h-full">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center text-muted-foreground">
              <IconVehicles className="h-16 w-16 opacity-30" />
            </div>
          )}
          {(overdueCount > 0 || dueSoonCount > 0) && (
            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              {overdueCount > 0 ? (
                <span className="rounded-full bg-danger px-2.5 py-1 text-xs font-semibold text-white shadow">
                  {t("overdueBadge", { count: overdueCount })}
                </span>
              ) : null}
              {dueSoonCount > 0 ? (
                <span className="rounded-full bg-warning px-2.5 py-1 text-xs font-semibold text-white shadow">
                  {t("dueSoonBadge", { count: dueSoonCount })}
                </span>
              ) : null}
            </div>
          )}
        </div>
        <CardContent className="flex flex-col justify-between gap-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("label")}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {title || primaryVehicle.licensePlate}
            </h2>
            {year ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{year}</p>
            ) : null}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <DashboardOdometerUpdate
                vehicleId={primaryVehicle.id}
                currentKm={primaryVehicle.currentOdometerKm}
                locale={locale}
              />
              {power ? (
                <div>
                  <dt className="text-muted-foreground">{t("power")}</dt>
                  <dd className="font-semibold text-foreground">{power} PS</dd>
                </div>
              ) : null}
              {fuel ? (
                <div>
                  <dt className="text-muted-foreground">{t("fuel")}</dt>
                  <dd className="font-semibold text-foreground">{fuel}</dd>
                </div>
              ) : null}
              {primaryVehicle.licensePlate ? (
                <div>
                  <dt className="text-muted-foreground">{t("plate")}</dt>
                  <dd className="font-semibold text-foreground">
                    {primaryVehicle.licensePlate}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/vehicles/${primaryVehicle.id}`}
              className="inline-flex rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              {t("viewVehicle")}
            </Link>
            <Link
              href="/maintenance"
              className="inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
            >
              {t("manageMaintenance")}
            </Link>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export async function DueSoonCard() {
  const t = await getTranslations("dashboard.dueSoon");
  const { dueSoonCount } = await getDashboardStats();

  return (
    <StatCard
      label={t("title")}
      value={dueSoonCount}
      detail={t("description")}
      icon={IconMaintenance}
      className={
        dueSoonCount > 0 ? MAINTENANCE_STATUS_CARD_CLASS.OVERDUE : undefined
      }
    />
  );
}

export async function CostOverviewCard({ locale }: { locale: string }) {
  const t = await getTranslations("dashboard.costOverview");
  const { expenses } = await getDashboardStats();

  return (
    <StatCard
      label={t("title")}
      value={formatCurrency(expenses.currentCents, expenses.currency, locale)}
      detail={t("description")}
      trend={
        expenses.previousCents > 0 || expenses.currentCents > 0
          ? {
              label: t("trend", { percent: expenses.trendPercent }),
              tone: expenses.trendPercent > 0 ? "negative" : "positive",
            }
          : undefined
      }
      icon={IconExpenses}
    />
  );
}

export async function UpcomingMaintenanceCard() {
  const t = await getTranslations("dashboard.upcomingMaintenance");
  const { upcomingMaintenance } = await getDashboardStats();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <Link
          href="/maintenance"
          className="shrink-0 text-xs font-medium text-accent hover:underline"
        >
          {t("viewAll")}
        </Link>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {upcomingMaintenance.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          upcomingMaintenance.map((item) => {
            const dueStatus = item.dueStatus as MaintenanceDueStatus;
            return (
              <Link
                key={item.id}
                href={`/maintenance/${item.id}#log-service`}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition hover:shadow-md ${MAINTENANCE_STATUS_CARD_CLASS[dueStatus]}`}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.vehicleName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold tabular-nums ${MAINTENANCE_STATUS_BADGE_CLASS[dueStatus]}`}
                  >
                    {item.dueStatus === "OVERDUE"
                      ? t("overdue")
                      : item.dueInDays != null
                        ? t("dueInDays", { days: Math.max(0, item.dueInDays) })
                        : item.dueInKm != null
                          ? t("dueInKm", { km: item.dueInKm })
                          : "—"}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
