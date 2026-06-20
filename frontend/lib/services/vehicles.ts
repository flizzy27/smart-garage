import { getCurrentUserId } from "@/lib/auth/current-user";
import { resolveCatalogModelYear } from "@/lib/catalog/resolve-spec";
import {
  createVehicleImageDocument,
  softDeleteVehicleImages,
} from "@/lib/repositories/documents";
import {
  countVehiclesByOwner,
  createVehicle,
  findVehicleById,
  listVehiclesByOwner,
  softDeleteVehicle,
  updateVehicle,
  upsertVehicleCurrentSpec,
  type CreateVehicleData,
} from "@/lib/repositories/vehicles";
import { saveVehicleImage } from "@/lib/storage/local";
import {
  parseVehicleFormData,
  type VehicleFormInput,
} from "@/lib/validations/vehicle";
import { ZodError } from "zod";

export type VehicleActionError = {
  code: string;
  field?: string;
};

export type VehicleActionResult =
  | { success: true; vehicleId: string }
  | { success: false; error: VehicleActionError };

function mapZodError(error: ZodError): VehicleActionError {
  const issue = error.issues[0];
  return {
    code: issue?.message ?? "validationFailed",
    field: issue?.path[0]?.toString(),
  };
}

function mapError(error: unknown): VehicleActionError {
  if (error instanceof ZodError) {
    return mapZodError(error);
  }
  if (error instanceof Error) {
    return { code: error.message };
  }
  return { code: "unknown" };
}

async function buildVehiclePayload(
  input: VehicleFormInput,
  ownerUserId: string,
): Promise<CreateVehicleData> {
  const catalog = await resolveCatalogModelYear(input.catalogModelYearId);
  if (!catalog || catalog.manufacturerId !== input.manufacturerId) {
    throw new Error("CATALOG_NOT_FOUND");
  }

  const factorySpec = {
    engineCode: catalog.engineCode,
    engineDescription: catalog.engineDescription,
    powerKw: catalog.powerKw,
    powerPs: catalog.powerPs,
    torqueNm: catalog.torqueNm,
    fuelType: catalog.fuelType,
    displacementCc: catalog.displacementCc,
    bodyType: catalog.bodyType,
    driveType: catalog.driveType,
    transmissionTypes: catalog.transmissionTypes,
    productionYearFrom: catalog.productionYearFrom,
    productionYearTo: catalog.productionYearTo,
    rawCatalog: catalog.rawCatalog,
  };

  const currentSpec = {
    engineCode: input.engineCode ?? catalog.engineCode,
    engineDescription: input.engineDescription ?? catalog.engineDescription,
    powerKw: input.powerKw ?? catalog.powerKw,
    powerPs: input.powerPs ?? catalog.powerPs,
    torqueNm: input.torqueNm ?? catalog.torqueNm,
    fuelType: input.fuelType ?? catalog.fuelType,
    displacementCc: input.displacementCc ?? catalog.displacementCc,
    bodyType: input.bodyType ?? catalog.bodyType,
    driveType: input.driveType ?? catalog.driveType,
    transmissionTypes: catalog.transmissionTypes,
  };

  return {
    ownerUserId,
    manufacturerId: input.manufacturerId,
    catalogModelYearId: input.catalogModelYearId,
    make: catalog.make,
    model: catalog.model,
    productionYear: input.productionYear,
    year: input.productionYear,
    vin: input.vin || null,
    hsn: input.hsn || null,
    tsn: input.tsn || null,
    licensePlate: input.licensePlate,
    currentOdometerKm: input.currentOdometerKm,
    color: input.color,
    notes: input.notes,
    factorySpec,
    currentSpec,
  };
}

export async function getVehiclesForCurrentUser() {
  const ownerUserId = await getCurrentUserId();
  return listVehiclesByOwner(ownerUserId);
}

export async function getVehicleForCurrentUser(id: string) {
  const ownerUserId = await getCurrentUserId();
  return findVehicleById(id, ownerUserId);
}

export async function getVehicleCountForCurrentUser() {
  const ownerUserId = await getCurrentUserId();
  return countVehiclesByOwner(ownerUserId);
}

export async function createVehicleForCurrentUser(
  formData: FormData,
): Promise<VehicleActionResult> {
  try {
    const ownerUserId = await getCurrentUserId();
    const input = parseVehicleFormData(formData);
    const payload = await buildVehiclePayload(input, ownerUserId);
    const vehicle = await createVehicle(payload);

    const { seedDefaultSchedulesForVehicle } = await import(
      "@/lib/services/maintenance"
    );
    await seedDefaultSchedulesForVehicle(vehicle.id);

    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      const saved = await saveVehicleImage(vehicle.id, image);
      await createVehicleImageDocument(vehicle.id, ownerUserId, saved);
    }

    return { success: true, vehicleId: vehicle.id };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

export async function updateVehicleForCurrentUser(
  vehicleId: string,
  formData: FormData,
): Promise<VehicleActionResult> {
  try {
    const ownerUserId = await getCurrentUserId();
    const existing = await findVehicleById(vehicleId, ownerUserId);
    if (!existing) {
      return { success: false, error: { code: "notFound" } };
    }

    const input = parseVehicleFormData(formData);
    const payload = await buildVehiclePayload(input, ownerUserId);
    const { ownerUserId: ownerId, factorySpec: _factory, ...updateData } =
      payload;
    void ownerId;
    void _factory;

    const result = await updateVehicle(vehicleId, ownerUserId, updateData);
    if (result.count === 0) {
      return { success: false, error: { code: "notFound" } };
    }

    await upsertVehicleCurrentSpec(vehicleId, payload.currentSpec);

    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      await softDeleteVehicleImages(vehicleId);
      const saved = await saveVehicleImage(vehicleId, image);
      await createVehicleImageDocument(vehicleId, ownerUserId, saved);
    }

    return { success: true, vehicleId };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}

export async function deleteVehicleForCurrentUser(
  vehicleId: string,
): Promise<{ success: boolean; error?: VehicleActionError }> {
  try {
    const ownerUserId = await getCurrentUserId();
    const result = await softDeleteVehicle(vehicleId, ownerUserId);
    if (result.count === 0) {
      return { success: false, error: { code: "notFound" } };
    }
    await softDeleteVehicleImages(vehicleId);
    return { success: true };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}
