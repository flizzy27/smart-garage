import { getCurrentUserId } from "@/lib/auth/current-user";
import { resolveCatalogModelYear } from "@/lib/catalog/resolve-spec";
import {
  createVehicleImageDocument,
  softDeleteVehicleImages,
} from "@/lib/repositories/documents";
import {
  countAccessibleVehicles,
  createVehicle,
  findAccessibleVehicle,
  listAccessibleVehicles,
  softDeleteVehicle,
  updateVehicle,
  updateVehicleOdometer,
  upsertVehicleCurrentSpec,
  type CreateVehicleData,
} from "@/lib/repositories/vehicles";
import { resolveVehicleAccess } from "@/lib/vehicles/access";
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
  if (input.entryMode === "manual") {
    const modelLabel = [input.model, input.variantName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ");

    const engineDescription =
      input.engineDescription?.trim() ||
      input.manualEngineName?.trim() ||
      null;

    const spec = {
      engineCode: input.engineCode ?? null,
      engineDescription,
      powerKw: input.powerKw ?? null,
      powerPs: input.powerPs ?? null,
      torqueNm: input.torqueNm ?? null,
      fuelType: input.fuelType ?? null,
      displacementCc: input.displacementCc ?? null,
      bodyType: input.bodyType ?? null,
      driveType: input.driveType ?? null,
      transmissionTypes: null,
      productionYearFrom: input.productionYear,
      productionYearTo: input.productionYear,
      rawCatalog: null,
    };

    return {
      ownerUserId,
      manufacturerId: null,
      catalogModelYearId: null,
      make: input.make!.trim(),
      model: modelLabel,
      productionYear: input.productionYear,
      year: input.productionYear,
      vin: input.vin || null,
      hsn: input.hsn || null,
      tsn: input.tsn || null,
      licensePlate: input.licensePlate,
      currentOdometerKm: input.currentOdometerKm,
      color: input.color,
      notes: input.notes,
      factorySpec: spec,
      currentSpec: {
        engineCode: spec.engineCode,
        engineDescription: spec.engineDescription,
        powerKw: spec.powerKw,
        powerPs: spec.powerPs,
        torqueNm: spec.torqueNm,
        fuelType: spec.fuelType,
        displacementCc: spec.displacementCc,
        bodyType: spec.bodyType,
        driveType: spec.driveType,
        transmissionTypes: null,
      },
    };
  }

  const catalog = await resolveCatalogModelYear(input.catalogModelYearId!);
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
    cylinders: catalog.cylinders,
    doors: catalog.doors,
    seats: catalog.seats,
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
    cylinders: catalog.cylinders,
    doors: catalog.doors,
    seats: catalog.seats,
    bodyType: input.bodyType ?? catalog.bodyType,
    driveType: input.driveType ?? catalog.driveType,
    transmissionTypes: catalog.transmissionTypes,
  };

  return {
    ownerUserId,
    manufacturerId: input.manufacturerId,
    catalogModelYearId: input.catalogModelYearId ?? null,
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
  const userId = await getCurrentUserId();
  return listAccessibleVehicles(userId);
}

export async function getVehicleForCurrentUser(id: string) {
  const userId = await getCurrentUserId();
  return findAccessibleVehicle(id, userId);
}

export async function getVehicleCountForCurrentUser() {
  const userId = await getCurrentUserId();
  return countAccessibleVehicles(userId);
}

export async function updateOdometerForCurrentUser(
  vehicleId: string,
  currentOdometerKm: number,
): Promise<{ success: boolean; error?: VehicleActionError }> {
  try {
    if (!Number.isInteger(currentOdometerKm) || currentOdometerKm < 0) {
      return { success: false, error: { code: "mileageInvalid" } };
    }
    const userId = await getCurrentUserId();
    const result = await updateVehicleOdometer(vehicleId, userId, currentOdometerKm);
    if (result.count === 0) {
      return { success: false, error: { code: "notFound" } };
    }
    return { success: true };
  } catch {
    return { success: false, error: { code: "unknown" } };
  }
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
    const userId = await getCurrentUserId();
    const access = await resolveVehicleAccess(userId, vehicleId);
    if (!access?.canEdit) {
      return { success: false, error: { code: "notFound" } };
    }

    const existing = await findAccessibleVehicle(vehicleId, userId);
    if (!existing) {
      return { success: false, error: { code: "notFound" } };
    }

    const input = parseVehicleFormData(formData);
    const payload = await buildVehiclePayload(input, existing.ownerUserId);
    const { ownerUserId: ownerId, factorySpec: _factory, ...updateData } =
      payload;
    void ownerId;
    void _factory;

    const result = await updateVehicle(vehicleId, existing.ownerUserId, updateData);
    if (result.count === 0) {
      return { success: false, error: { code: "notFound" } };
    }

    await upsertVehicleCurrentSpec(vehicleId, payload.currentSpec);
    // Editing the vehicle rewrites the current spec from the form's base power,
    // which would erase modification power gains. Re-apply modifications so the
    // displayed "current" power stays factory + mods.
    const { recalculateVehicleCurrentSpec } = await import(
      "@/lib/repositories/modifications"
    );
    await recalculateVehicleCurrentSpec(vehicleId);

    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      await softDeleteVehicleImages(vehicleId);
      const saved = await saveVehicleImage(vehicleId, image);
      await createVehicleImageDocument(vehicleId, userId, saved);
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
