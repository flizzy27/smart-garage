import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { MainContentWidth } from "@/components/layout/MainContentWidth";
import { FuelAnalyticsPanel } from "@/components/fuel/FuelAnalyticsPanel";
import { FuelLibrary } from "@/components/fuel/FuelLibrary";
import { computeFuelAnalytics } from "@/lib/fuel/analytics";
import { getFuelPageData } from "@/lib/services/fuel";
import { listVehiclesByOwner } from "@/lib/repositories/vehicles";
import { getCurrentUserId } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ vehicle?: string }>;
};

export default async function FuelPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { vehicle: vehicleFilter } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("fuel");

  const ownerUserId = await getCurrentUserId();
  const [{ entries }, vehicles] = await Promise.all([
    getFuelPageData(vehicleFilter),
    listVehiclesByOwner(ownerUserId),
  ]);

  const vehicleOptions = vehicles.map((vehicle) => ({
    id: vehicle.id,
    label:
      [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
      vehicle.licensePlate ||
      vehicle.id,
  }));

  const analytics = computeFuelAnalytics(entries);

  return (
    <MainContentWidth className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <FuelAnalyticsPanel analytics={analytics} />
      <FuelLibrary
        entries={entries}
        vehicles={vehicleOptions}
        defaultVehicleId={vehicleFilter}
      />
    </MainContentWidth>
  );
}
