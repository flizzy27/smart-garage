import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { VehicleForm } from "@/components/vehicles/VehicleForm";
import { createVehicleAction } from "@/lib/actions/vehicles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function NewVehiclePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vehicles");

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title={t("create.title")} subtitle={t("create.subtitle")} />
      <Card>
        <CardContent className="py-6">
          <VehicleForm
            action={createVehicleAction}
            cancelHref="/vehicles"
            submitLabel={t("create.submit")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
