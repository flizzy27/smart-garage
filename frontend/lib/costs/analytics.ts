import type { ExpenseCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { vehicleAccessWhere } from "@/lib/vehicles/access";

export type CostChartPoint = {
  date: string;
  label: string;
  value: number;
};

export type CostAnalytics = {
  monthlyTrend: CostChartPoint[];
  byCategory: Array<{ category: ExpenseCategory; totalCents: number }>;
  byVehicle: Array<{ vehicleId: string; name: string; totalCents: number }>;
  yearTotalCents: number;
  monthTotalCents: number;
  currency: string;
};

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { month: "short", year: "2-digit" });
}

export async function getCostAnalytics(
  userId: string,
  locale: string,
  months = 12,
): Promise<CostAnalytics> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [expenses, fuelEntries] = await Promise.all([
    prisma.expense.findMany({
      where: {
        vehicle: vehicleAccessWhere(userId),
        occurredAt: { gte: start },
      },
      select: {
        amountCents: true,
        category: true,
        occurredAt: true,
        vehicleId: true,
        vehicle: { select: { make: true, model: true, licensePlate: true } },
      },
    }),
    prisma.fuelEntry.findMany({
      where: {
        vehicle: vehicleAccessWhere(userId),
        filledAt: { gte: start },
      },
      select: {
        totalCostCents: true,
        filledAt: true,
        vehicleId: true,
        vehicle: { select: { make: true, model: true, licensePlate: true } },
      },
    }),
  ]);

  const monthMap = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    monthMap.set(monthKey(d), 0);
  }

  const categoryMap = new Map<ExpenseCategory, number>();
  const vehicleMap = new Map<string, { name: string; total: number }>();

  let yearTotalCents = 0;
  let monthTotalCents = 0;
  const currentMonthKey = monthKey(now);

  for (const e of expenses) {
    const cents = Number(e.amountCents);
    const key = monthKey(e.occurredAt);
    if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) ?? 0) + cents);
    yearTotalCents += cents;
    if (key === currentMonthKey) monthTotalCents += cents;

    categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + cents);

    const vName =
      [e.vehicle.make, e.vehicle.model].filter(Boolean).join(" ") ||
      e.vehicle.licensePlate ||
      e.vehicleId;
    const v = vehicleMap.get(e.vehicleId) ?? { name: vName, total: 0 };
    v.total += cents;
    vehicleMap.set(e.vehicleId, v);
  }

  for (const f of fuelEntries) {
    const cents = Number(f.totalCostCents);
    const key = monthKey(f.filledAt);
    if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) ?? 0) + cents);
    yearTotalCents += cents;
    if (key === currentMonthKey) monthTotalCents += cents;

    categoryMap.set("FUEL", (categoryMap.get("FUEL") ?? 0) + cents);

    const vName =
      [f.vehicle.make, f.vehicle.model].filter(Boolean).join(" ") ||
      f.vehicle.licensePlate ||
      f.vehicleId;
    const v = vehicleMap.get(f.vehicleId) ?? { name: vName, total: 0 };
    v.total += cents;
    vehicleMap.set(f.vehicleId, v);
  }

  const monthlyTrend: CostChartPoint[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const key = monthKey(d);
    monthlyTrend.push({
      date: key,
      label: monthLabel(d, locale),
      value: (monthMap.get(key) ?? 0) / 100,
    });
  }

  return {
    monthlyTrend,
    byCategory: [...categoryMap.entries()]
      .map(([category, totalCents]) => ({ category, totalCents }))
      .sort((a, b) => b.totalCents - a.totalCents),
    byVehicle: [...vehicleMap.entries()]
      .map(([vehicleId, { name, total }]) => ({
        vehicleId,
        name,
        totalCents: total,
      }))
      .sort((a, b) => b.totalCents - a.totalCents),
    yearTotalCents,
    monthTotalCents,
    currency: "EUR",
  };
}
