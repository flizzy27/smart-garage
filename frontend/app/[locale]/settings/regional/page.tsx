import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { RegionalSettings } from "@/components/settings/SettingsForm";
import { SettingsSection } from "@/components/settings/SettingsSection";

type Props = { params: Promise<{ locale: string }> };

export default async function RegionalSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.settings");

  return (
    <div className="space-y-6">
      <PageHeader title={t("regional.title")} subtitle={t("regional.description")} />
      <SettingsSection
        title={t("regional.title")}
        description={t("regional.description")}
      >
        <RegionalSettings />
      </SettingsSection>
    </div>
  );
}
