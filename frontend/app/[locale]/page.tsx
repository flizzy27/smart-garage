import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { MainContentWidth } from "@/components/layout/MainContentWidth";
import {
  CostOverviewCard,
  DueSoonCard,
  PrimaryVehicleCard,
  UpcomingMaintenanceCard,
} from "@/components/dashboard/DashboardCards";
import { FuelQuickAddCard } from "@/components/dashboard/FuelQuickAddCard";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  return (
    <MainContentWidth className="space-y-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <FuelQuickAddCard />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PrimaryVehicleCard locale={locale} />
        <DueSoonCard />
        <CostOverviewCard locale={locale} />
      </div>
      <UpcomingMaintenanceCard />
    </MainContentWidth>
  );
}
