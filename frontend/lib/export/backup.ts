import { prisma } from "@/lib/prisma";
import { vehicleAccessWhere } from "@/lib/vehicles/access";

export async function buildUserExport(userId: string) {
  const [vehicles, expenses, fuelEntries, wishlistItems, preferences] =
    await Promise.all([
      prisma.vehicle.findMany({
        where: vehicleAccessWhere(userId),
        include: {
          factorySpecs: true,
          currentSpecs: true,
          maintenanceSchedules: true,
          inspections: true,
          insurancePolicies: true,
        },
      }),
      prisma.expense.findMany({
        where: { vehicle: vehicleAccessWhere(userId) },
      }),
      prisma.fuelEntry.findMany({
        where: { vehicle: vehicleAccessWhere(userId) },
      }),
      prisma.wishlistItem.findMany({ where: { userId } }),
      prisma.userPreferences.findUnique({ where: { userId } }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    version: process.env.APP_VERSION ?? "0.4.4",
    preferences: preferences
      ? {
          theme: preferences.theme,
          locale: preferences.locale,
          timezone: preferences.timezone,
          currency: preferences.currency,
          designPreset: preferences.designPreset,
        }
      : null,
    vehicles: vehicles.map((v) => ({
      ...v,
      purchasePriceCents: v.purchasePriceCents?.toString() ?? null,
    })),
    expenses: expenses.map((e) => ({
      ...e,
      amountCents: e.amountCents.toString(),
    })),
    fuelEntries: fuelEntries.map((f) => ({
      ...f,
      totalCostCents: f.totalCostCents.toString(),
    })),
    wishlistItems: wishlistItems.map((w) => ({
      ...w,
      estimatedCostCents: w.estimatedCostCents?.toString() ?? null,
      plannedBudgetCents: w.plannedBudgetCents?.toString() ?? null,
    })),
  };
}

export function expensesToCsv(
  expenses: Array<{
    occurredAt: Date;
    category: string;
    amountCents: bigint;
    currency: string;
    description: string | null;
    vehicleId: string;
  }>,
  vehicleNames: Map<string, string>,
): string {
  const header = "date,category,amount,currency,vehicle,description";
  const rows = expenses.map((e) => {
    const amount = (Number(e.amountCents) / 100).toFixed(2);
    const vehicle = vehicleNames.get(e.vehicleId) ?? e.vehicleId;
    const desc = (e.description ?? "").replace(/"/g, '""');
    return `${e.occurredAt.toISOString().slice(0, 10)},${e.category},${amount},${e.currency},"${vehicle}","${desc}"`;
  });
  return [header, ...rows].join("\n");
}
