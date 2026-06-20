import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { formatDistance } from "@/lib/regional/format";
import type { SerializedVehicle } from "@/lib/vehicles/serialize";
import {
  getVehicleDisplayName,
  getVehicleImageUrl,
} from "@/lib/vehicles/serialize";
import { VehicleModificationsButton } from "./VehicleModifications";

type VehicleDetailOverviewProps = {
  vehicle: SerializedVehicle;
  locale: string;
};

function SpecRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 border-b border-border-subtle py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function PowerComparison({
  label,
  factory,
  current,
  gain,
  unit,
}: {
  label: string;
  factory: number | null;
  current: number | null;
  gain: number | null;
  unit: string;
}) {
  if (factory == null && current == null) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Factory</p>
          <p className="text-lg font-semibold text-foreground">
            {factory != null ? `${factory} ${unit}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Current</p>
          <p className="text-lg font-semibold text-foreground">
            {current != null ? `${current} ${unit}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Gain</p>
          <p className="text-lg font-semibold text-accent">
            {gain != null && gain !== 0
              ? `${gain > 0 ? "+" : ""}${gain} ${unit}`
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

export async function VehicleDetailOverview({
  vehicle,
  locale,
}: VehicleDetailOverviewProps) {
  const t = await getTranslations("vehicles");
  const tFuel = await getTranslations("vehicles.fuelTypes");
  const tBody = await getTranslations("vehicles.bodyTypes");
  const tDrive = await getTranslations("vehicles.driveTypes");
  const imageUrl = getVehicleImageUrl(vehicle.imageDocumentId);
  const title = getVehicleDisplayName(vehicle);

  const factory = vehicle.factorySpecs;
  const current = vehicle.currentSpecs;

  const catalogLine = [
    vehicle.generationName,
    vehicle.variantName,
    vehicle.engineName,
    vehicle.productionYear,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="aspect-[16/10] bg-muted/40">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                {t("noImage")}
              </div>
            )}
          </div>
          <CardContent className="space-y-1 py-4">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {catalogLine ? (
              <p className="text-sm text-muted-foreground">{catalogLine}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {vehicle.licensePlate ? (
                <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                  {vehicle.licensePlate}
                </span>
              ) : null}
              {vehicle.color ? <span>{vehicle.color}</span> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">
              {t("detail.specifications")}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <PowerComparison
              label={t("detail.powerPs")}
              factory={factory?.powerPs ?? null}
              current={current?.powerPs ?? null}
              gain={vehicle.powerGainPs}
              unit="PS"
            />
            <PowerComparison
              label={t("detail.powerKw")}
              factory={factory?.powerKw ?? null}
              current={current?.powerKw ?? null}
              gain={vehicle.powerGainKw}
              unit="kW"
            />
            <dl>
              <SpecRow
                label={t("mileage")}
                value={formatDistance(vehicle.currentOdometerKm, locale)}
              />
              <SpecRow label={t("form.vin")} value={vehicle.vin} />
              <SpecRow
                label={t("form.hsnTsn")}
                value={
                  vehicle.hsn || vehicle.tsn
                    ? `${vehicle.hsn ?? "—"} / ${vehicle.tsn ?? "—"}`
                    : null
                }
              />
              <SpecRow
                label={t("form.engineCode")}
                value={current?.engineCode ?? factory?.engineCode}
              />
              <SpecRow
                label={t("form.engineDescription")}
                value={current?.engineDescription ?? factory?.engineDescription}
              />
              <SpecRow
                label={t("form.displacement")}
                value={
                  (current?.displacementCc ?? factory?.displacementCc) != null
                    ? `${((current?.displacementCc ?? factory?.displacementCc)! / 1000).toFixed(1)} L`
                    : null
                }
              />
              <SpecRow
                label={t("form.fuelType")}
                value={
                  (current?.fuelType ?? factory?.fuelType)
                    ? tFuel(current?.fuelType ?? factory?.fuelType!)
                    : null
                }
              />
              <SpecRow
                label={t("form.bodyType")}
                value={
                  (current?.bodyType ?? factory?.bodyType)
                    ? tBody(current?.bodyType ?? factory?.bodyType!)
                    : null
                }
              />
              <SpecRow
                label={t("form.driveType")}
                value={
                  (current?.driveType ?? factory?.driveType)
                    ? tDrive(current?.driveType ?? factory?.driveType!)
                    : null
                }
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      {vehicle.notes ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">
              {t("form.notes")}
            </h2>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {vehicle.notes}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("modifications.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {vehicle.modifications.length === 0
                ? t("modifications.empty")
                : t("modifications.count", { count: vehicle.modifications.length })}
            </p>
          </div>
          <VehicleModificationsButton
            vehicleId={vehicle.id}
            modifications={vehicle.modifications}
          />
        </CardContent>
      </Card>
    </div>
  );
}
