import type { InsuranceCoverageType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { vehicleAccessWhere } from "@/lib/vehicles/access";

export type InsurancePolicyInput = {
  provider: string;
  policyNumber?: string | null;
  premiumCents: bigint;
  currency?: string;
  sfClass?: string | null;
  coverageType: InsuranceCoverageType;
  startDate: Date;
  endDate: Date;
  autoRenew?: boolean;
  notes?: string | null;
};

export async function listInsurancePoliciesForUser(userId: string) {
  return prisma.insurancePolicy.findMany({
    where: { vehicle: vehicleAccessWhere(userId) },
    include: {
      vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
    },
    orderBy: { endDate: "asc" },
  });
}

export async function listInsurancePoliciesForVehicle(vehicleId: string, userId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ...vehicleAccessWhere(userId) },
    select: { id: true },
  });
  if (!vehicle) return [];

  return prisma.insurancePolicy.findMany({
    where: { vehicleId },
    orderBy: { endDate: "desc" },
  });
}

export async function createInsurancePolicy(
  vehicleId: string,
  userId: string,
  data: InsurancePolicyInput,
) {
  const access = await import("@/lib/vehicles/access").then((m) =>
    m.resolveVehicleAccess(userId, vehicleId),
  );
  if (!access?.canEdit) return null;

  return prisma.insurancePolicy.create({
    data: {
      vehicleId,
      provider: data.provider.trim(),
      policyNumber: data.policyNumber?.trim() || null,
      premiumCents: data.premiumCents,
      currency: data.currency ?? "EUR",
      sfClass: data.sfClass?.trim() || null,
      coverageType: data.coverageType,
      startDate: data.startDate,
      endDate: data.endDate,
      autoRenew: data.autoRenew ?? true,
      notes: data.notes?.trim() || null,
    },
  });
}

export async function deleteInsurancePolicy(id: string, userId: string) {
  const row = await prisma.insurancePolicy.findUnique({
    where: { id },
    select: { vehicleId: true },
  });
  if (!row) return { count: 0 };

  const access = await import("@/lib/vehicles/access").then((m) =>
    m.resolveVehicleAccess(userId, row.vehicleId),
  );
  if (!access?.canEdit) return { count: 0 };

  return prisma.insurancePolicy.deleteMany({ where: { id } });
}

export async function listExpiringPolicies(userId: string, withinDays = 45) {
  const now = new Date();
  const until = new Date(now);
  until.setDate(until.getDate() + withinDays);

  return prisma.insurancePolicy.findMany({
    where: {
      vehicle: vehicleAccessWhere(userId),
      endDate: { lte: until, gte: now },
    },
    include: {
      vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
    },
    orderBy: { endDate: "asc" },
  });
}
