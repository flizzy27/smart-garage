import type { VehicleShareRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type VehicleAccess = {
  vehicleId: string;
  ownerUserId: string;
  role: "OWNER" | VehicleShareRole;
  canEdit: boolean;
};

export async function resolveVehicleAccess(
  userId: string,
  vehicleId: string,
): Promise<VehicleAccess | null> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, deletedAt: null },
    select: { id: true, ownerUserId: true },
  });
  if (!vehicle) return null;

  if (vehicle.ownerUserId === userId) {
    return {
      vehicleId: vehicle.id,
      ownerUserId: vehicle.ownerUserId,
      role: "OWNER",
      canEdit: true,
    };
  }

  const share = await prisma.vehicleShare.findUnique({
    where: { vehicleId_userId: { vehicleId, userId } },
    select: { role: true },
  });
  if (!share) return null;

  return {
    vehicleId: vehicle.id,
    ownerUserId: vehicle.ownerUserId,
    role: share.role,
    canEdit: share.role === "EDITOR",
  };
}

export async function listAccessibleVehicleIds(userId: string): Promise<string[]> {
  const [owned, shared] = await Promise.all([
    prisma.vehicle.findMany({
      where: { ownerUserId: userId, deletedAt: null },
      select: { id: true },
    }),
    prisma.vehicleShare.findMany({
      where: { userId },
      select: { vehicleId: true },
    }),
  ]);

  const ids = new Set<string>();
  for (const v of owned) ids.add(v.id);
  for (const s of shared) ids.add(s.vehicleId);
  return [...ids];
}

export function vehicleAccessWhere(userId: string) {
  return {
    deletedAt: null as null,
    OR: [
      { ownerUserId: userId },
      { shares: { some: { userId } } },
    ],
  };
}
