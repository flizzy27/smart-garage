import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DeleteVehicleButton } from "@/components/vehicles/DeleteVehicleButton";
import { VehicleDetailOverview } from "@/components/vehicles/VehicleDetailOverview";
import { VehicleHubModules } from "@/components/vehicles/VehicleHubModules";
import { getVehicleForCurrentUser } from "@/lib/services/vehicles";
import {
  getVehicleDisplayName,
  serializeVehicle,
} from "@/lib/vehicles/serialize";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function VehicleDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vehicles");

  const record = await getVehicleForCurrentUser(id);
  if (!record) {
    notFound();
  }

  const vehicle = serializeVehicle(record);
  const title = getVehicleDisplayName(vehicle);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <PageHeader
        title={title}
        subtitle={t("detail.subtitle")}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/vehicles/${vehicle.id}/edit`}>
              <Button variant="secondary">{t("editVehicle")}</Button>
            </Link>
            <DeleteVehicleButton vehicle={vehicle} />
          </div>
        }
      />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("detail.overview")}
        </h2>
        <VehicleDetailOverview vehicle={vehicle} locale={locale} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("hub.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("hub.subtitle")}</p>
        </div>
        <VehicleHubModules
          vehicleId={vehicle.id}
          counts={{
            maintenance: vehicle.maintenanceCount,
            expenses: vehicle.expenseCount,
            documents: vehicle.documentCount,
            fuel: vehicle.fuelCount,
          }}
        />
      </section>
    </div>
  );
}
