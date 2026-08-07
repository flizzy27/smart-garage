import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { MainContentWidth } from "@/components/layout/MainContentWidth";
import { FuelStationFinder } from "@/components/fuel/FuelStationFinder";
import { isFuelPriceLookupConfigured } from "@/lib/services/fuel-price-config";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function FuelPricesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("fuelPrices");

  // Checked on the server so the API key never has to reach the browser, not
  // even as a boolean derived from it.
  const configured = await isFuelPriceLookupConfigured();

  return (
    <MainContentWidth className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <FuelStationFinder configured={configured} />
    </MainContentWidth>
  );
}
