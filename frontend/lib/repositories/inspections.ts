import type { InspectionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { vehicleAccessWhere } from "@/lib/vehicles/access";

export type InspectionInput = {
  type: InspectionType;
  nextDueAt: Date;
  lastPerformedAt?: Date | null;
  reminderWeeksBefore?: number;
  stickerNumber?: string | null;
  notes?: string | null;
};

export async function listInspectionsForUser(userId: string) {
  return prisma.vehicleInspection.findMany({
    where: { vehicle: vehicleAccessWhere(userId) },
    include: {
      vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
    },
    orderBy: { nextDueAt: "asc" },
  });
}

export async function listInspectionsForVehicle(vehicleId: string, userId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ...vehicleAccessWhere(userId) },
    select: { id: true },
  });
  if (!vehicle) return [];

  return prisma.vehicleInspection.findMany({
    where: { vehicleId },
    orderBy: { type: "asc" },
  });
}

export async function upsertInspection(
  vehicleId: string,
  userId: string,
  data: InspectionInput,
) {
  const access = await import("@/lib/vehicles/access").then((m) =>
    m.resolveVehicleAccess(userId, vehicleId),
  );
  if (!access?.canEdit) return null;

  return prisma.vehicleInspection.upsert({
    where: { vehicleId_type: { vehicleId, type: data.type } },
    create: {
      vehicleId,
      type: data.type,
      nextDueAt: data.nextDueAt,
      lastPerformedAt: data.lastPerformedAt ?? null,
      reminderWeeksBefore: data.reminderWeeksBefore ?? 4,
      stickerNumber: data.stickerNumber?.trim() || null,
      notes: data.notes?.trim() || null,
    },
    update: {
      nextDueAt: data.nextDueAt,
      lastPerformedAt: data.lastPerformedAt ?? null,
      reminderWeeksBefore: data.reminderWeeksBefore ?? 4,
      stickerNumber: data.stickerNumber?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });
}

export async function deleteInspection(
  id: string,
  userId: string,
) {
  const row = await prisma.vehicleInspection.findUnique({
    where: { id },
    select: { vehicleId: true },
  });
  if (!row) return { count: 0 };

  const access = await import("@/lib/vehicles/access").then((m) =>
    m.resolveVehicleAccess(userId, row.vehicleId),
  );
  if (!access?.canEdit) return { count: 0 };

  return prisma.vehicleInspection.deleteMany({ where: { id } });
}

export async function listDueInspectionsForUser(userId: string, withinDays = 30) {
  const now = new Date();
  const until = new Date(now);
  until.setDate(until.getDate() + withinDays);

  return prisma.vehicleInspection.findMany({
    where: {
      vehicle: vehicleAccessWhere(userId),
      nextDueAt: { lte: until },
    },
    include: {
      vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
    },
    orderBy: { nextDueAt: "asc" },
  });
}
