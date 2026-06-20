import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { MaintenanceBoard } from "@/components/maintenance/MaintenanceBoard";
import { getMaintenancePageData, seedMaintenanceTemplates, bootstrapSchedulesForOwner } from "@/lib/services/maintenance";
import { listVehiclesByOwner } from "@/lib/repositories/vehicles";
import { getCurrentUserId } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ vehicle?: string }> };

export default async function MaintenancePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { vehicle: vehicleFilter } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("maintenance");
  const ownerUserId = await getCurrentUserId();

  await seedMaintenanceTemplates();
  await bootstrapSchedulesForOwner(ownerUserId);
  const [{ templates, schedules }, vehicles] = await Promise.all([
    getMaintenancePageData(locale as "en" | "de"),
    listVehiclesByOwner(ownerUserId),
  ]);

  const vehicleOptions = vehicles.map((vehicle) => ({
    id: vehicle.id,
    label:
      [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
      vehicle.licensePlate ||
      vehicle.id,
    odometerKm: vehicle.currentOdometerKm,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <MaintenanceBoard
        schedules={schedules}
        templates={templates}
        vehicles={vehicleOptions}
        defaultVehicleId={vehicleFilter}
      />
    </div>
  );
}
