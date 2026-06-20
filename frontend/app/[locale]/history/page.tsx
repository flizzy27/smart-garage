import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { MaintenanceHistoryTimeline } from "@/components/maintenance/MaintenanceHistoryTimeline";
import { Card, CardContent } from "@/components/ui/Card";
import { getHistoryPageData } from "@/lib/services/maintenance";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function HistoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("history");
  const { records } = await getHistoryPageData(locale as "en" | "de");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Card>
        <CardContent className="py-6">
          <MaintenanceHistoryTimeline records={records} />
        </CardContent>
      </Card>
    </div>
  );
}
