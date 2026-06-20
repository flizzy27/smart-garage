import type { VehicleShareRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function listSharesForVehicle(vehicleId: string, ownerUserId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerUserId, deletedAt: null },
    select: { id: true },
  });
  if (!vehicle) return [];

  return prisma.vehicleShare.findMany({
    where: { vehicleId },
    include: {
      user: { select: { id: true, username: true, displayName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listSharedWithUser(userId: string) {
  return prisma.vehicleShare.findMany({
    where: { userId },
    include: {
      vehicle: {
        select: {
          id: true,
          make: true,
          model: true,
          licensePlate: true,
          ownerUserId: true,
        },
      },
    },
  });
}

export async function addVehicleShare(
  vehicleId: string,
  ownerUserId: string,
  username: string,
  role: VehicleShareRole,
) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerUserId, deletedAt: null },
    select: { id: true },
  });
  if (!vehicle) return { error: "vehicleNotFound" as const };

  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
    select: { id: true, username: true },
  });
  if (!user) return { error: "userNotFound" as const };
  if (user.id === ownerUserId) return { error: "selfShare" as const };

  const share = await prisma.vehicleShare.upsert({
    where: { vehicleId_userId: { vehicleId, userId: user.id } },
    create: { vehicleId, userId: user.id, role },
    update: { role },
    include: {
      user: { select: { id: true, username: true, displayName: true } },
    },
  });

  return { share };
}

export async function removeVehicleShare(
  shareId: string,
  ownerUserId: string,
) {
  const row = await prisma.vehicleShare.findUnique({
    where: { id: shareId },
    include: { vehicle: { select: { ownerUserId: true } } },
  });
  if (!row || row.vehicle.ownerUserId !== ownerUserId) return { count: 0 };

  return prisma.vehicleShare.deleteMany({ where: { id: shareId } });
}

export async function updateVehicleShareRole(
  shareId: string,
  ownerUserId: string,
  role: VehicleShareRole,
) {
  const row = await prisma.vehicleShare.findUnique({
    where: { id: shareId },
    include: { vehicle: { select: { ownerUserId: true } } },
  });
  if (!row || row.vehicle.ownerUserId !== ownerUserId) return { count: 0 };

  return prisma.vehicleShare.updateMany({
    where: { id: shareId },
    data: { role },
  });
}
