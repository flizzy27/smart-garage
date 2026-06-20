import { Link } from "@/lib/i18n/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { formatDistance } from "@/lib/regional/format";
import type { SerializedVehicle } from "@/lib/vehicles/serialize";
import {
  getVehicleDisplayName,
  getVehicleImageUrl,
} from "@/lib/vehicles/serialize";

type VehicleCardProps = {
  vehicle: SerializedVehicle;
  locale: string;
  mileageLabel: string;
};

export function VehicleCard({
  vehicle,
  locale,
  mileageLabel,
}: VehicleCardProps) {
  const imageUrl = getVehicleImageUrl(vehicle.imageDocumentId);
  const title = getVehicleDisplayName(vehicle);

  return (
    <Link href={`/vehicles/${vehicle.id}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="aspect-[16/10] overflow-hidden bg-muted/40">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {vehicle.manufacturerName}
            </div>
          )}
        </div>
        <CardContent className="space-y-2 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-foreground">{title}</h3>
              {vehicle.year ? (
                <p className="text-sm text-muted-foreground">{vehicle.year}</p>
              ) : null}
            </div>
            {vehicle.licensePlate ? (
              <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {vehicle.licensePlate}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {mileageLabel}:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatDistance(vehicle.currentOdometerKm, locale)}
            </span>
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
