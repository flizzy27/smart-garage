import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { CustomFieldSettings } from "@/components/settings/CustomFieldSettings";
import { VehicleFieldSettings } from "@/components/settings/SettingsForm";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { listCustomFieldsForUser } from "@/lib/repositories/custom-fields";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function VehicleFieldSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.settings");

  const userId = await getCurrentUserId();
  const customFields = await listCustomFieldsForUser(userId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("vehicleFields.title")}
        subtitle={t("vehicleFields.description")}
      />
      <SettingsSection
        title={t("vehicleFields.visibilityTitle")}
        description={t("vehicleFields.visibilityDescription")}
      >
        <VehicleFieldSettings />
      </SettingsSection>
      <SettingsSection
        title={t("vehicleFields.customTitle")}
        description={t("vehicleFields.customDescription")}
      >
        <CustomFieldSettings fields={customFields} />
      </SettingsSection>
    </div>
  );
}
