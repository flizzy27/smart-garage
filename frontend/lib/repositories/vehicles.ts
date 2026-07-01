import type { BodyType, DriveType, FuelType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildVehicleMetadata } from "@/lib/domain/vehicle-metadata";
import { vehicleAccessWhere } from "@/lib/vehicles/access";

const vehicleInclude = {
  manufacturer: true,
  catalogModelYear: {
    include: {
      engine: true,
      variant: {
        include: {
          generation: {
            include: { series: true },
          },
        },
      },
    },
  },
  factorySpecs: true,
  currentSpecs: true,
  modifications: {
    orderBy: { installedAt: "desc" as const },
  },
  documents: {
    where: {
      purpose: "VEHICLE_IMAGE" as const,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
  _count: {
    select: {
      maintenanceRecords: true,
      expenses: true,
      documents: {
        where: {
          deletedAt: null,
          purpose: { in: ["VEHICLE_DOCUMENT", "RECEIPT", "OTHER"] },
        },
      },
      modifications: true,
      fuelEntries: true,
      linkedNotes: true,
    },
  },
} satisfies Prisma.VehicleInclude;

export type VehicleWithRelations = Prisma.VehicleGetPayload<{
  include: typeof vehicleInclude;
}>;

export async function listVehiclesByOwner(
  ownerUserId: string,
): Promise<VehicleWithRelations[]> {
  return prisma.vehicle.findMany({
    where: { ownerUserId, deletedAt: null },
    include: vehicleInclude,
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function listAccessibleVehicles(
  userId: string,
): Promise<VehicleWithRelations[]> {
  return prisma.vehicle.findMany({
    where: vehicleAccessWhere(userId),
    include: vehicleInclude,
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function findVehicleById(
  id: string,
  ownerUserId: string,
): Promise<VehicleWithRelations | null> {
  return prisma.vehicle.findFirst({
    where: { id, ownerUserId, deletedAt: null },
    include: vehicleInclude,
  });
}

export async function findAccessibleVehicle(
  id: string,
  userId: string,
): Promise<VehicleWithRelations | null> {
  return prisma.vehicle.findFirst({
    where: { id, ...vehicleAccessWhere(userId) },
    include: vehicleInclude,
  });
}

export async function updateVehicleOdometer(
  id: string,
  userId: string,
  currentOdometerKm: number,
) {
  const vehicle = await findAccessibleVehicle(id, userId);
  if (!vehicle) return { count: 0 };

  const access = await import("@/lib/vehicles/access").then((m) =>
    m.resolveVehicleAccess(userId, id),
  );
  if (!access?.canEdit) return { count: 0 };

  return prisma.vehicle.updateMany({
    where: { id, deletedAt: null },
    data: { currentOdometerKm },
  });
}

export type VehicleSpecInput = {
  engineCode?: string | null;
  engineDescription?: string | null;
  powerKw?: number | null;
  powerPs?: number | null;
  torqueNm?: number | null;
  fuelType?: FuelType | null;
  displacementCc?: number | null;
  cylinders?: number | null;
  doors?: number | null;
  seats?: number | null;
  bodyType?: BodyType | null;
  driveType?: DriveType | null;
  transmissionTypes?: string[] | null;
  productionYearFrom?: number | null;
  productionYearTo?: number | null;
  rawCatalog?: Record<string, unknown> | null;
};

export type CreateVehicleData = {
  ownerUserId: string;
  manufacturerId: string | null;
  catalogModelYearId: string | null;
  make: string;
  model: string;
  productionYear: number;
  year?: number | null;
  vin?: string | null;
  hsn?: string | null;
  tsn?: string | null;
  licensePlate?: string | null;
  currentOdometerKm: number;
  color?: string | null;
  notes?: string | null;
  factorySpec: VehicleSpecInput;
  currentSpec: VehicleSpecInput;
};

export async function createVehicle(data: CreateVehicleData) {
  return prisma.vehicle.create({
    data: {
      ownerUserId: data.ownerUserId,
      manufacturerId: data.manufacturerId,
      catalogModelYearId: data.catalogModelYearId,
      make: data.make,
      model: data.model,
      productionYear: data.productionYear,
      year: data.productionYear,
      vin: data.vin?.trim() || null,
      hsn: data.hsn?.trim() || null,
      tsn: data.tsn?.trim().toUpperCase() || null,
      licensePlate: data.licensePlate?.trim() || null,
      currentOdometerKm: data.currentOdometerKm,
      notes: data.notes?.trim() || null,
      metadata: buildVehicleMetadata(data.color),
      factorySpecs: {
        create: mapFactorySpec(data.factorySpec),
      },
      currentSpecs: {
        create: mapCurrentSpec(data.currentSpec),
      },
    },
  });
}

export type UpdateVehicleData = Omit<
  CreateVehicleData,
  "ownerUserId" | "factorySpec"
>;

export async function updateVehicle(
  id: string,
  ownerUserId: string,
  data: UpdateVehicleData,
) {
  return prisma.vehicle.updateMany({
    where: { id, ownerUserId, deletedAt: null },
    data: {
      manufacturerId: data.manufacturerId,
      catalogModelYearId: data.catalogModelYearId,
      make: data.make,
      model: data.model,
      productionYear: data.productionYear,
      year: data.productionYear,
      vin: data.vin?.trim() || null,
      hsn: data.hsn?.trim() || null,
      tsn: data.tsn?.trim().toUpperCase() || null,
      licensePlate: data.licensePlate?.trim() || null,
      currentOdometerKm: data.currentOdometerKm,
      notes: data.notes?.trim() || null,
      metadata: buildVehicleMetadata(data.color),
    },
  });
}

export async function upsertVehicleCurrentSpec(
  vehicleId: string,
  spec: VehicleSpecInput,
) {
  return prisma.vehicleCurrentSpec.upsert({
    where: { vehicleId },
    create: {
      vehicleId,
      ...mapCurrentSpec(spec),
    },
    update: mapCurrentSpec(spec),
  });
}

export async function softDeleteVehicle(id: string, ownerUserId: string) {
  return prisma.vehicle.updateMany({
    where: { id, ownerUserId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

export async function countVehiclesByOwner(ownerUserId: string) {
  return prisma.vehicle.count({
    where: { ownerUserId, deletedAt: null },
  });
}

export async function countAccessibleVehicles(userId: string) {
  return prisma.vehicle.count({
    where: vehicleAccessWhere(userId),
  });
}

function mapFactorySpec(spec: VehicleSpecInput) {
  return {
    engineCode: spec.engineCode ?? null,
    engineDescription: spec.engineDescription ?? null,
    powerKw: spec.powerKw ?? null,
    powerPs: spec.powerPs ?? null,
    torqueNm: spec.torqueNm ?? null,
    fuelType: spec.fuelType ?? null,
    displacementCc: spec.displacementCc ?? null,
    cylinders: spec.cylinders ?? null,
    doors: spec.doors ?? null,
    seats: spec.seats ?? null,
    bodyType: spec.bodyType ?? null,
    driveType: spec.driveType ?? null,
    transmissionTypes: spec.transmissionTypes ?? undefined,
    productionYearFrom: spec.productionYearFrom ?? null,
    productionYearTo: spec.productionYearTo ?? null,
    rawCatalog: (spec.rawCatalog ?? undefined) as Prisma.InputJsonValue | undefined,
  };
}

function mapCurrentSpec(spec: VehicleSpecInput) {
  return {
    engineCode: spec.engineCode ?? null,
    engineDescription: spec.engineDescription ?? null,
    powerKw: spec.powerKw ?? null,
    powerPs: spec.powerPs ?? null,
    torqueNm: spec.torqueNm ?? null,
    fuelType: spec.fuelType ?? null,
    displacementCc: spec.displacementCc ?? null,
    cylinders: spec.cylinders ?? null,
    doors: spec.doors ?? null,
    seats: spec.seats ?? null,
    bodyType: spec.bodyType ?? null,
    driveType: spec.driveType ?? null,
    transmissionTypes: spec.transmissionTypes ?? undefined,
  };
}
