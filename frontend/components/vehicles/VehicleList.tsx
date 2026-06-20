import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import type { SerializedVehicle } from "@/lib/vehicles/serialize";

type VehicleListProps = {
  vehicles: SerializedVehicle[];
  locale: string;
};

export async function VehicleList({ vehicles, locale }: VehicleListProps) {
  const t = await getTranslations("vehicles");

  if (vehicles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 17h8M5 11l1.5-4.5h11L19 11M5 11v6h14v-6M7 17a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zm7 0a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground">{t("empty.title")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t("empty.description")}
        </p>
        <div className="mt-6">
          <Link href="/vehicles/new">
            <Button>{t("addVehicle")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {vehicles.map((vehicle) => (
        <VehicleCard
          key={vehicle.id}
          vehicle={vehicle}
          locale={locale}
          mileageLabel={t("mileage")}
        />
      ))}
    </div>
  );
}
