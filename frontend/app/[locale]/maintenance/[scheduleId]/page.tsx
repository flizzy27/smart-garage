import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { LogMaintenanceForm } from "@/components/maintenance/LogMaintenanceForm";
import { MaintenanceHistoryTimeline } from "@/components/maintenance/MaintenanceHistoryTimeline";
import { MaintenanceReceiptUpload } from "@/components/maintenance/MaintenanceReceiptUpload";
import { ScheduleDetailHeader } from "@/components/maintenance/ScheduleDetailHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Link } from "@/lib/i18n/navigation";
import { getScheduleDetailData } from "@/lib/services/maintenance";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; scheduleId: string }>;
};

export default async function ScheduleDetailPage({ params }: Props) {
  const { locale, scheduleId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("maintenance.detail");

  const data = await getScheduleDetailData(scheduleId, locale as "en" | "de");
  if (!data) {
    notFound();
  }

  const { schedule, records, currentOdometerKm } = data;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link
          href="/maintenance"
          className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← {t("back")}
        </Link>
      </div>

      <ScheduleDetailHeader
        schedule={schedule}
        recordCount={records.length}
        locale={locale}
      />

      <LogMaintenanceForm
        scheduleId={schedule.id}
        vehicleId={schedule.vehicleId}
        defaultOdometerKm={currentOdometerKm}
      />

      <MaintenanceReceiptUpload
        vehicleId={schedule.vehicleId}
        records={records.map((record) => ({
          id: record.id,
          label: `${record.serviceName} · ${new Date(record.performedAt).toLocaleDateString(locale)}`,
        }))}
      />

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {t("historyTitle")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("historySubtitle", { count: records.length })}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <MaintenanceHistoryTimeline records={records} compact />
        </CardContent>
      </Card>
    </div>
  );
}
