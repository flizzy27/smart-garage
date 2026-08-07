import { getCurrentUserId } from "@/lib/auth/current-user";
import { computeFuelAnalytics } from "@/lib/fuel/analytics";
import {
  listFuelEntriesForOwner,
  serializeFuelEntry,
} from "@/lib/repositories/fuel";
import { listVehiclesByOwner } from "@/lib/repositories/vehicles";

/**
 * What the calculator can borrow from a vehicle's real fill-up history, so the
 * user does not have to guess their own consumption. Everything is metric
 * storage units — the UI converts.
 */
export type CalculatorVehiclePreset = {
  id: string;
  label: string;
  /** Measured between fill-ups; needs odometer readings, so it is often null. */
  avgConsumptionLPer100Km: number | null;
  /** Price of the most recent fill-up — the best guess for "today's price". */
  lastPricePerLiter: number | null;
  avgPricePerLiter: number | null;
  /** Extrapolated from the logged distance; seeds the comparison section. */
  projectedAnnualKm: number | null;
  entryCount: number;
};

export async function getFuelCalculatorPageData(): Promise<{
  vehicles: CalculatorVehiclePreset[];
}> {
  const ownerUserId = await getCurrentUserId();
  const [vehicles, entryRows] = await Promise.all([
    listVehiclesByOwner(ownerUserId),
    listFuelEntriesForOwner(ownerUserId),
  ]);

  const entries = entryRows.map(serializeFuelEntry);

  const presets = vehicles.map((vehicle) => {
    const own = entries.filter((entry) => entry.vehicleId === vehicle.id);
    const analytics = computeFuelAnalytics(own);

    // `listFuelEntriesForOwner` sorts newest first, so the first priced entry
    // is the most recent one we can derive a per-litre price from.
    const latestPriced = own.find(
      (entry) => entry.liters != null && entry.liters > 0,
    );

    return {
      id: vehicle.id,
      label:
        [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
        vehicle.licensePlate ||
        vehicle.id,
      avgConsumptionLPer100Km: analytics.avgConsumptionLPer100Km,
      lastPricePerLiter:
        latestPriced?.liters != null && latestPriced.liters > 0
          ? latestPriced.totalCostCents / 100 / latestPriced.liters
          : null,
      avgPricePerLiter: analytics.avgPricePerLiter,
      projectedAnnualKm: analytics.projectedAnnualKm,
      entryCount: own.length,
    } satisfies CalculatorVehiclePreset;
  });

  return { vehicles: presets };
}
