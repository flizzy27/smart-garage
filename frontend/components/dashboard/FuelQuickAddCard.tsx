import { FuelQuickAdd } from "@/components/dashboard/FuelQuickAdd";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getPrimaryVehicleForOwner } from "@/lib/repositories/dashboard";
import { listVehiclesByOwner } from "@/lib/repositories/vehicles";

export async function FuelQuickAddCard() {
  const ownerUserId = await getCurrentUserId();
  const [vehicles, primaryVehicle] = await Promise.all([
    listVehiclesByOwner(ownerUserId),
    getPrimaryVehicleForOwner(ownerUserId),
  ]);

  if (vehicles.length === 0) return null;

  const vehicleOptions = vehicles.map((vehicle) => ({
    id: vehicle.id,
    label:
      [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
      vehicle.licensePlate ||
      vehicle.id,
  }));

  return (
    <FuelQuickAdd
      vehicles={vehicleOptions}
      defaultVehicleId={primaryVehicle?.id}
    />
  );
}
