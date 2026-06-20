import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { VehicleForm } from "@/components/vehicles/VehicleForm";
import { VehicleModifications } from "@/components/vehicles/VehicleModifications";
import { updateVehicleAction } from "@/lib/actions/vehicles";
import {
  findCatalogEngineById,
  findCatalogGenerationById,
  findCatalogManufacturerById,
  findCatalogModelYearById,
  findCatalogSeriesById,
  findCatalogVariantById,
} from "@/lib/repositories/catalog";
import { getVehicleForCurrentUser } from "@/lib/services/vehicles";
import { serializeVehicle } from "@/lib/vehicles/serialize";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function EditVehiclePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vehicles");

  const record = await getVehicleForCurrentUser(id);
  if (!record) {
    notFound();
  }

  const vehicle = serializeVehicle(record);

  const [manufacturer, series, generation, variant, engine, modelYear] =
    await Promise.all([
      vehicle.manufacturerId
        ? findCatalogManufacturerById(vehicle.manufacturerId)
        : null,
      vehicle.seriesId ? findCatalogSeriesById(vehicle.seriesId) : null,
      vehicle.generationId
        ? findCatalogGenerationById(vehicle.generationId)
        : null,
      vehicle.variantId ? findCatalogVariantById(vehicle.variantId) : null,
      vehicle.engineId ? findCatalogEngineById(vehicle.engineId) : null,
      vehicle.catalogModelYearId
        ? findCatalogModelYearById(vehicle.catalogModelYearId)
        : null,
    ]);

  const boundUpdateAction = updateVehicleAction.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title={t("edit.title")} subtitle={t("edit.subtitle")} />
      <Card>
        <CardContent className="py-6">
          <VehicleForm
            initialVehicle={vehicle}
            initialSelections={{
              manufacturer: manufacturer
                ? { id: manufacturer.id, label: manufacturer.name }
                : null,
              series: series
                ? { id: series.id, label: series.name }
                : null,
              generation: generation
                ? { id: generation.id, label: generation.name }
                : null,
              variant: variant
                ? { id: variant.id, label: variant.name }
                : null,
              engine: engine
                ? { id: engine.id, label: engine.name }
                : null,
              modelYear: modelYear
                ? { id: modelYear.id, label: String(modelYear.year) }
                : null,
            }}
            action={boundUpdateAction}
            cancelHref={`/vehicles/${vehicle.id}`}
            submitLabel={t("edit.submit")}
          />
        </CardContent>
      </Card>

      <div className="mt-6">
        <VehicleModifications
          vehicleId={vehicle.id}
          modifications={vehicle.modifications}
        />
      </div>
    </div>
  );
}
