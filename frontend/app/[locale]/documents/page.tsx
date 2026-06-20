import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocumentsLibrary } from "@/components/documents/DocumentsLibrary";
import { getDocumentsPageData } from "@/lib/services/documents";
import { listVehiclesByOwner } from "@/lib/repositories/vehicles";
import { getCurrentUserId } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ vehicle?: string }>;
};

export default async function DocumentsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { vehicle: vehicleFilter } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("documents");

  const ownerUserId = await getCurrentUserId();
  const [{ documents }, vehicles] = await Promise.all([
    getDocumentsPageData(vehicleFilter),
    listVehiclesByOwner(ownerUserId),
  ]);

  const vehicleOptions = vehicles.map((vehicle) => ({
    id: vehicle.id,
    label:
      [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
      vehicle.licensePlate ||
      vehicle.id,
  }));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <DocumentsLibrary
        documents={documents}
        vehicles={vehicleOptions}
        defaultVehicleId={vehicleFilter}
      />
    </div>
  );
}
