import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpensesLibrary } from "@/components/expenses/ExpensesLibrary";
import { getExpensesPageData } from "@/lib/services/expenses";
import { listVehiclesByOwner } from "@/lib/repositories/vehicles";
import { getCurrentUserId } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ vehicle?: string }>;
};

export default async function ExpensesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { vehicle: vehicleFilter } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("expenses");

  const ownerUserId = await getCurrentUserId();
  const [{ expenses }, vehicles] = await Promise.all([
    getExpensesPageData(vehicleFilter),
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
      <ExpensesLibrary
        expenses={expenses}
        vehicles={vehicleOptions}
        defaultVehicleId={vehicleFilter}
      />
    </div>
  );
}
