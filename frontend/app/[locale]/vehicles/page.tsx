import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { VehicleList } from "@/components/vehicles/VehicleList";
import { getVehiclesForCurrentUser } from "@/lib/services/vehicles";
import { serializeVehicle } from "@/lib/vehicles/serialize";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function VehiclesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vehicles");

  const vehicles = (await getVehiclesForCurrentUser()).map(serializeVehicle);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          vehicles.length > 0 ? (
            <Link href="/vehicles/new">
              <Button>{t("addVehicle")}</Button>
            </Link>
          ) : null
        }
      />
      <VehicleList vehicles={vehicles} locale={locale} />
    </div>
  );
}
