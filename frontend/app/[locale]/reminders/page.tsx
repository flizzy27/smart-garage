import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { RemindersBoard } from "@/components/reminders/RemindersBoard";
import { InspectionReminders } from "@/components/reminders/InspectionReminders";
import { getMaintenancePageData } from "@/lib/services/maintenance";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function RemindersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reminders");

  const { schedules } = await getMaintenancePageData(locale as "en" | "de");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <InspectionReminders locale={locale} />
      <RemindersBoard schedules={schedules} />
    </div>
  );
}
