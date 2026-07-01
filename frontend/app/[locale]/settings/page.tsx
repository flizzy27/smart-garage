import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  AppearanceSettings,
  LanguageSettings,
  MaintenanceReminderSettings,
} from "@/components/settings/SettingsForm";
import { BackgroundSettings } from "@/components/settings/BackgroundSettings";
import {
  BackgroundBlurSettings,
  DesignPresetSettings,
} from "@/components/settings/DesignSettings";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { findAppearanceForUser } from "@/lib/repositories/preferences";
import { getCurrentUserId } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function GeneralSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.settings");
  const ownerUserId = await getCurrentUserId();
  const appearance = await findAppearanceForUser(ownerUserId);

  return (
    <div className="space-y-6">
      <PageHeader title={t("general.title")} subtitle={t("general.description")} />

      <SettingsSection
        title={t("language.title")}
        description={t("language.description")}
      >
        <LanguageSettings />
      </SettingsSection>

      <SettingsSection
        title={t("appearance.title")}
        description={t("appearance.description")}
      >
        <AppearanceSettings />
      </SettingsSection>

      <SettingsSection
        title={t("maintenance.title")}
        description={t("maintenance.description")}
      >
        <MaintenanceReminderSettings />
      </SettingsSection>

      <SettingsSection
        title={t("design.title")}
        description={t("design.description")}
      >
        <DesignPresetSettings />
      </SettingsSection>

      <SettingsSection
        title={t("background.title")}
        description={t("background.description")}
      >
        <BackgroundSettings hasBackground={appearance.hasBackground} />
        <BackgroundBlurSettings hasBackground={appearance.hasBackground} />
      </SettingsSection>
    </div>
  );
}
