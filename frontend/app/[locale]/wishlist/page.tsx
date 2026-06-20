import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { WishlistBoard, type WishlistItemView } from "@/components/wishlist/WishlistBoard";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { listWishlistItems } from "@/lib/repositories/wishlist";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function WishlistPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("wishlist");
  const userId = await getCurrentUserId();
  const rows = await listWishlistItems(userId);

  const items: WishlistItemView[] = rows.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    status: item.status,
    plannedMake: item.plannedMake,
    plannedModel: item.plannedModel,
    plannedYear: item.plannedYear,
    plannedBudgetCents: item.plannedBudgetCents
      ? Number(item.plannedBudgetCents)
      : null,
    estimatedCostCents: item.estimatedCostCents
      ? Number(item.estimatedCostCents)
      : null,
    currency: item.currency,
    targetDate: item.targetDate?.toISOString() ?? null,
    url: item.url,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <WishlistBoard items={items} locale={locale} />
    </div>
  );
}
