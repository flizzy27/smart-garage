import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { CatalogDataAttribution } from "@/components/settings/SettingsForm";
import { SettingsSection } from "@/components/settings/SettingsSection";

type Props = { params: Promise<{ locale: string }> };

export default async function CatalogSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.settings");

  return (
    <div className="space-y-6">
      <PageHeader title={t("catalog.title")} subtitle={t("catalog.description")} />
      <SettingsSection
        title={t("catalog.title")}
        description={t("catalog.description")}
      >
        <CatalogDataAttribution />
      </SettingsSection>
    </div>
  );
}
