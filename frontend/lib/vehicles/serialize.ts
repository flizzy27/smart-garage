import type {
  BodyType,
  DriveType,
  FuelType,
  ModificationCategory,
} from "@prisma/client";
import type { VehicleWithRelations } from "@/lib/repositories/vehicles";
import { parseVehicleMetadata } from "@/lib/domain/vehicle-metadata";
import {
  computeCurrentPowerFromModifications,
  computeCurrentTorqueFromModifications,
} from "@/lib/catalog/resolve-spec";

export type SerializedVehicleSpec = {
  engineCode: string | null;
  engineDescription: string | null;
  powerKw: number | null;
  powerPs: number | null;
  torqueNm: number | null;
  fuelType: FuelType | null;
  displacementCc: number | null;
  cylinders: number | null;
  doors: number | null;
  seats: number | null;
  bodyType: BodyType | null;
  driveType: DriveType | null;
};

export type SerializedModification = {
  id: string;
  category: ModificationCategory;
  name: string;
  description: string | null;
  installedAt: string | null;
  costCents: string | null;
  currency: string | null;
  addedPowerKw: number | null;
  addedPowerPs: number | null;
  addedTorqueNm: number | null;
  notes: string | null;
  isCustom: boolean;
};

export type SerializedVehicle = {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  productionYear: number | null;
  vin: string | null;
  hsn: string | null;
  tsn: string | null;
  licensePlate: string | null;
  currentOdometerKm: number;
  color: string | null;
  notes: string | null;
  manufacturerId: string | null;
  catalogModelYearId: string | null;
  seriesId: string | null;
  generationId: string | null;
  variantId: string | null;
  engineId: string | null;
  manufacturerName: string | null;
  seriesName: string | null;
  generationName: string | null;
  variantName: string | null;
  engineName: string | null;
  factorySpecs: SerializedVehicleSpec | null;
  currentSpecs: SerializedVehicleSpec | null;
  powerGainPs: number | null;
  powerGainKw: number | null;
  torqueGainNm: number | null;
  modifications: SerializedModification[];
  imageDocumentId: string | null;
  maintenanceCount: number;
  expenseCount: number;
  documentCount: number;
  fuelCount: number;
  modificationCount: number;
  updatedAt: string;
};

function serializeSpec(
  spec:
    | {
        engineCode: string | null;
        engineDescription: string | null;
        powerKw: number | null;
        powerPs: number | null;
        torqueNm: number | null;
        fuelType: FuelType | null;
        displacementCc: number | null;
        cylinders?: number | null;
        doors?: number | null;
        seats?: number | null;
        bodyType: BodyType | null;
        driveType: DriveType | null;
      }
    | null
    | undefined,
): SerializedVehicleSpec | null {
  if (!spec) return null;
  return {
    engineCode: spec.engineCode,
    engineDescription: spec.engineDescription,
    powerKw: spec.powerKw,
    powerPs: spec.powerPs,
    torqueNm: spec.torqueNm,
    fuelType: spec.fuelType,
    displacementCc: spec.displacementCc,
    cylinders: spec.cylinders ?? null,
    doors: spec.doors ?? null,
    seats: spec.seats ?? null,
    bodyType: spec.bodyType,
    driveType: spec.driveType,
  };
}

export function serializeVehicle(vehicle: VehicleWithRelations): SerializedVehicle {
  const metadata = parseVehicleMetadata(vehicle.metadata);
  const image = vehicle.documents[0];
  const catalog = vehicle.catalogModelYear;

  const computedPower = computeCurrentPowerFromModifications(
    vehicle.factorySpecs?.powerKw ?? null,
    vehicle.factorySpecs?.powerPs ?? null,
    vehicle.modifications,
  );
  const computedTorque = computeCurrentTorqueFromModifications(
    vehicle.factorySpecs?.torqueNm ?? null,
    vehicle.modifications,
  );

  const currentSpecs = vehicle.currentSpecs
    ? {
        ...vehicle.currentSpecs,
        powerKw: vehicle.currentSpecs.powerKw ?? computedPower.powerKw,
        powerPs: vehicle.currentSpecs.powerPs ?? computedPower.powerPs,
        torqueNm: vehicle.currentSpecs.torqueNm ?? computedTorque,
      }
    : null;

  const factoryPs = vehicle.factorySpecs?.powerPs ?? null;
  const factoryKw = vehicle.factorySpecs?.powerKw ?? null;
  const currentPs = currentSpecs?.powerPs ?? null;
  const currentKw = currentSpecs?.powerKw ?? null;

  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    productionYear: vehicle.productionYear,
    vin: vehicle.vin,
    hsn: vehicle.hsn,
    tsn: vehicle.tsn,
    licensePlate: vehicle.licensePlate,
    currentOdometerKm: vehicle.currentOdometerKm,
    color: metadata.color ?? null,
    notes: vehicle.notes,
    manufacturerId: vehicle.manufacturerId,
    catalogModelYearId: vehicle.catalogModelYearId,
    seriesId: catalog?.variant.generation.series.id ?? null,
    generationId: catalog?.variant.generation.id ?? null,
    variantId: catalog?.variant.id ?? null,
    engineId: catalog?.engine.id ?? null,
    manufacturerName: vehicle.manufacturer?.name ?? vehicle.make,
    seriesName: catalog?.variant.generation.series.name ?? vehicle.model,
    generationName: catalog?.variant.generation.name ?? null,
    variantName: catalog?.variant.name ?? null,
    engineName: catalog?.engine.name ?? null,
    factorySpecs: serializeSpec(vehicle.factorySpecs),
    currentSpecs: serializeSpec(currentSpecs),
    powerGainPs:
      factoryPs != null && currentPs != null ? currentPs - factoryPs : null,
    powerGainKw:
      factoryKw != null && currentKw != null ? currentKw - factoryKw : null,
    torqueGainNm:
      vehicle.factorySpecs?.torqueNm != null && currentSpecs?.torqueNm != null
        ? currentSpecs.torqueNm - vehicle.factorySpecs.torqueNm
        : null,
    modifications: vehicle.modifications.map((mod) => ({
      id: mod.id,
      category: mod.category,
      name: mod.name,
      description: mod.description,
      installedAt: mod.installedAt?.toISOString() ?? null,
      costCents: mod.costCents?.toString() ?? null,
      currency: mod.currency,
      addedPowerKw: mod.addedPowerKw,
      addedPowerPs: mod.addedPowerPs,
      addedTorqueNm: mod.addedTorqueNm,
      notes: mod.notes,
      isCustom: mod.isCustom,
    })),
    imageDocumentId: image?.id ?? null,
    maintenanceCount: vehicle._count.maintenanceRecords,
    expenseCount: vehicle._count.expenses,
    documentCount: vehicle._count.documents,
    fuelCount: vehicle._count.fuelEntries,
    modificationCount: vehicle._count.modifications,
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

export function getVehicleImageUrl(documentId: string | null): string | null {
  if (!documentId) return null;
  return `/api/vehicles/images/${documentId}`;
}

export function getVehicleDisplayName(vehicle: SerializedVehicle): string {
  const parts = [vehicle.manufacturerName, vehicle.seriesName].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return vehicle.licensePlate ?? vehicle.id;
}
