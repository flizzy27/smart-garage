import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { requireAdmin } from "@/lib/auth/current-user";
import { listUsersForAdmin } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  try {
    await requireAdmin();
  } catch {
    redirect(`/${locale}`);
  }

  const t = await getTranslations("admin");
  const users = await listUsersForAdmin();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <AdminUsersPanel
        users={users.map((user) => ({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          vehicleCount: user._count.vehicles,
        }))}
      />
    </div>
  );
}
