import { prisma } from "@/lib/prisma";
import { vehicleAccessWhere } from "@/lib/vehicles/access";

function monthBounds(offsetMonths = 0) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() + offsetMonths);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return { start, end };
}

export async function getPrimaryVehicleForOwner(ownerUserId: string) {
  return prisma.vehicle.findFirst({
    where: vehicleAccessWhere(ownerUserId),
    orderBy: [{ updatedAt: "desc" }],
    include: {
      factorySpecs: true,
      currentSpecs: true,
      catalogModelYear: {
        include: {
          engine: true,
          variant: {
            include: {
              generation: { include: { series: true } },
            },
          },
        },
      },
      documents: {
        where: { purpose: "VEHICLE_IMAGE", deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      maintenanceSchedules: {
        where: { isActive: true },
        include: { template: true },
        orderBy: [{ dueStatus: "desc" }, { nextDueAt: "asc" }],
        take: 5,
      },
    },
  });
}

export async function getMonthlyExpenseSummary(ownerUserId: string) {
  const current = monthBounds(0);
  const previous = monthBounds(-1);

  const [currentSum, previousSum] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        vehicle: vehicleAccessWhere(ownerUserId),
        occurredAt: { gte: current.start, lt: current.end },
      },
      _sum: { amountCents: true },
    }),
    prisma.expense.aggregate({
      where: {
        vehicle: vehicleAccessWhere(ownerUserId),
        occurredAt: { gte: previous.start, lt: previous.end },
      },
      _sum: { amountCents: true },
    }),
  ]);

  const currentCents = Number(currentSum._sum.amountCents ?? 0);
  const previousCents = Number(previousSum._sum.amountCents ?? 0);

  let trendPercent = 0;
  if (previousCents > 0) {
    trendPercent = Math.round(
      ((currentCents - previousCents) / previousCents) * 100,
    );
  } else if (currentCents > 0) {
    trendPercent = 100;
  }

  return {
    currentCents,
    previousCents,
    trendPercent,
    currency: "EUR",
  };
}
