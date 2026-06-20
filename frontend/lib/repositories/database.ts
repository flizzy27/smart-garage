import { prisma } from "@/lib/prisma";
import { getCatalogStats } from "@/lib/repositories/catalog";

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function getDatabaseStats() {
  const [catalog, users, vehicles] = await Promise.all([
    getCatalogStats(),
    prisma.user.count(),
    prisma.vehicle.count({ where: { deletedAt: null } }),
  ]);

  return {
    manufacturers: catalog.manufacturers,
    vehicleModels: catalog.series,
    catalogModelYears: catalog.modelYears,
    users,
    vehicles,
  };
}
