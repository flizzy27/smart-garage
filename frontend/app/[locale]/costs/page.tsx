import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { CostDashboard } from "@/components/costs/CostDashboard";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getCostAnalytics } from "@/lib/costs/analytics";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function CostsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("costs");
  const userId = await getCurrentUserId();
  const analytics = await getCostAnalytics(userId, locale);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <CostDashboard analytics={analytics} locale={locale} />
    </div>
  );
}
