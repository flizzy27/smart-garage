import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { FuelPriceSettings } from "@/components/settings/FuelPriceSettings";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getFuelPriceConfig,
  maskApiKey,
} from "@/lib/services/fuel-price-config";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function FuelPriceSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.settings.fuelPrices");

  const [user, config] = await Promise.all([
    getCurrentUser(),
    getFuelPriceConfig(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("description")} />

      <SettingsSection title={t("section.title")} description={t("section.description")}>
        <FuelPriceSettings
          // Only ever a masked form — the key itself never reaches the browser.
          maskedKey={config.apiKey ? maskApiKey(config.apiKey) : null}
          source={config.source}
          hasEnvKey={config.hasEnvKey}
          canEdit={user?.role === "ADMIN"}
        />
      </SettingsSection>
    </div>
  );
}
