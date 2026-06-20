import type { SerializedFuelEntry } from "@/lib/repositories/fuel";

export type FuelConsumptionSegment = {
  id: string;
  fromDate: string;
  toDate: string;
  distanceKm: number;
  liters: number;
  consumptionLPer100Km: number;
  costCents: number;
  costPer100KmCents: number | null;
};

export type FuelChartPoint = {
  label: string;
  value: number;
  date: string;
};

export type FuelAnalytics = {
  totalEntries: number;
  totalLiters: number;
  totalCostCents: number;
  avgPricePerLiter: number | null;
  avgConsumptionLPer100Km: number | null;
  avgCostPer100KmCents: number | null;
  totalDistanceKm: number;
  projectedAnnualLiters: number | null;
  projectedAnnualCostCents: number | null;
  projectedAnnualKm: number | null;
  segments: FuelConsumptionSegment[];
  priceHistory: FuelChartPoint[];
  consumptionHistory: FuelChartPoint[];
  monthlyCostHistory: FuelChartPoint[];
};

function daysBetweenIso(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(diff / 86_400_000, 1);
}

function pricePerLiter(entry: SerializedFuelEntry): number | null {
  if (entry.liters == null || entry.liters <= 0) return null;
  return entry.totalCostCents / 100 / entry.liters;
}

function shortDate(iso: string): string {
  return iso.slice(0, 10);
}

export function computeFuelAnalytics(
  entries: SerializedFuelEntry[],
): FuelAnalytics {
  const totalEntries = entries.length;
  const totalLiters = entries.reduce((sum, e) => sum + (e.liters ?? 0), 0);
  const totalCostCents = entries.reduce((sum, e) => sum + e.totalCostCents, 0);

  const pricedEntries = entries.filter((e) => pricePerLiter(e) != null);
  const avgPricePerLiter =
    pricedEntries.length > 0
      ? pricedEntries.reduce((sum, e) => sum + pricePerLiter(e)!, 0) /
        pricedEntries.length
      : null;

  const priceHistory: FuelChartPoint[] = [...entries]
    .sort(
      (a, b) => new Date(a.filledAt).getTime() - new Date(b.filledAt).getTime(),
    )
    .flatMap((entry) => {
      const price = pricePerLiter(entry);
      if (price == null) return [];
      return [
        {
          label: shortDate(entry.filledAt),
          value: price,
          date: entry.filledAt,
        },
      ];
    });

  const segments: FuelConsumptionSegment[] = [];
  const byVehicle = new Map<string, SerializedFuelEntry[]>();
  for (const entry of entries) {
    const list = byVehicle.get(entry.vehicleId) ?? [];
    list.push(entry);
    byVehicle.set(entry.vehicleId, list);
  }

  for (const vehicleEntries of byVehicle.values()) {
    const sorted = [...vehicleEntries].sort(
      (a, b) => new Date(a.filledAt).getTime() - new Date(b.filledAt).getTime(),
    );

    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (
        prev.odometerKm == null ||
        curr.odometerKm == null ||
        curr.liters == null ||
        curr.liters <= 0
      ) {
        continue;
      }

      const distanceKm = curr.odometerKm - prev.odometerKm;
      if (distanceKm <= 0) continue;

      const consumptionLPer100Km = (curr.liters / distanceKm) * 100;
      const segmentPrice = pricePerLiter(curr);
      segments.push({
        id: curr.id,
        fromDate: prev.filledAt,
        toDate: curr.filledAt,
        distanceKm,
        liters: curr.liters,
        consumptionLPer100Km,
        costCents: curr.totalCostCents,
        costPer100KmCents:
          segmentPrice != null
            ? Math.round((consumptionLPer100Km / 100) * segmentPrice * 100)
            : null,
      });
    }
  }

  segments.sort(
    (a, b) => new Date(a.toDate).getTime() - new Date(b.toDate).getTime(),
  );

  const totalDistanceKm = segments.reduce((sum, s) => sum + s.distanceKm, 0);
  const segmentLiters = segments.reduce((sum, s) => sum + s.liters, 0);

  const avgConsumptionLPer100Km =
    totalDistanceKm > 0 && segmentLiters > 0
      ? (segmentLiters / totalDistanceKm) * 100
      : null;

  const costPer100KmValues = segments
    .map((s) => s.costPer100KmCents)
    .filter((v): v is number => v != null);
  const avgCostPer100KmCents =
    costPer100KmValues.length > 0
      ? Math.round(
          costPer100KmValues.reduce((sum, v) => sum + v, 0) /
            costPer100KmValues.length,
        )
      : null;

  const consumptionHistory: FuelChartPoint[] = segments.map((segment) => ({
    label: shortDate(segment.toDate),
    value: segment.consumptionLPer100Km,
    date: segment.toDate,
  }));

  const monthly = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.filledAt.slice(0, 7);
    monthly.set(key, (monthly.get(key) ?? 0) + entry.totalCostCents);
  }
  const monthlyCostHistory: FuelChartPoint[] = [...monthly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cents]) => ({
      label: month,
      value: cents / 100,
      date: `${month}-01`,
    }));

  let projectedAnnualLiters: number | null = null;
  let projectedAnnualKm: number | null = null;
  let projectedAnnualCostCents: number | null = null;

  if (segments.length > 0 && avgConsumptionLPer100Km != null) {
    const periodStart = segments[0].fromDate;
    const periodEnd = segments[segments.length - 1].toDate;
    const days = daysBetweenIso(periodStart, periodEnd);
    const kmPerDay = totalDistanceKm / days;
    projectedAnnualKm = kmPerDay * 365;
    projectedAnnualLiters = (avgConsumptionLPer100Km / 100) * projectedAnnualKm;
  } else if (totalLiters > 0 && entries.length >= 2) {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.filledAt).getTime() - new Date(b.filledAt).getTime(),
    );
    const days = daysBetweenIso(
      sorted[0].filledAt,
      sorted[sorted.length - 1].filledAt,
    );
    projectedAnnualLiters = totalLiters * (365 / days);
  }

  if (projectedAnnualLiters != null && avgPricePerLiter != null) {
    projectedAnnualCostCents = Math.round(
      projectedAnnualLiters * avgPricePerLiter * 100,
    );
  }

  return {
    totalEntries,
    totalLiters,
    totalCostCents,
    avgPricePerLiter,
    avgConsumptionLPer100Km,
    avgCostPer100KmCents,
    totalDistanceKm,
    projectedAnnualLiters,
    projectedAnnualCostCents,
    projectedAnnualKm,
    segments,
    priceHistory,
    consumptionHistory,
    monthlyCostHistory,
  };
}
