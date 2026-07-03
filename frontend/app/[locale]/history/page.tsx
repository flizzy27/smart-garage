import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { HistoryFilters } from "@/components/maintenance/HistoryFilters";
import { UnifiedHistoryTimeline } from "@/components/maintenance/UnifiedHistoryTimeline";
import { Card, CardContent } from "@/components/ui/Card";
import { getHistoryPageData } from "@/lib/services/maintenance";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    search?: string;
    vehicleId?: string;
    category?: string;
    fromDate?: string;
    toDate?: string;
  }>;
};

export default async function HistoryPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const filters = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("history");
  const { events, vehicles } = await getHistoryPageData(locale as "en" | "de", filters);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <HistoryFilters vehicles={vehicles} />

      <Card>
        <CardContent className="py-6">
          <UnifiedHistoryTimeline events={events} />
        </CardContent>
      </Card>
    </div>
  );
}
