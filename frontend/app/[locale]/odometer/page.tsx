import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { MainContentWidth } from "@/components/layout/MainContentWidth";
import { OdometerLibrary } from "@/components/vehicles/OdometerLibrary";
import { getOdometerPageData } from "@/lib/services/odometer";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ vehicle?: string }>;
};

export default async function OdometerPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { vehicle: vehicleFilter } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("odometer");

  const { logs, analytics, vehicles } = await getOdometerPageData(vehicleFilter);

  return (
    <MainContentWidth className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <OdometerLibrary
        logs={logs}
        analytics={analytics}
        vehicles={vehicles}
        defaultVehicleId={vehicleFilter}
      />
    </MainContentWidth>
  );
}
