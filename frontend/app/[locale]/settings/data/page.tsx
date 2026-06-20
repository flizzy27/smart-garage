import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExportSettings } from "@/components/settings/ExportSettings";
import { SettingsSection } from "@/components/settings/SettingsSection";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function DataSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.settings.export");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("description")} />
      <SettingsSection title={t("sectionTitle")} description={t("sectionDescription")}>
        <ExportSettings />
      </SettingsSection>
    </div>
  );
}
