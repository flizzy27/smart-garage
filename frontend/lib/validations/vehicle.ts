import { BodyType, DriveType, FuelType } from "@prisma/client";
import { z } from "zod";

const currentYear = new Date().getFullYear();

const optionalInt = z
  .number({ error: "invalid" })
  .int("invalid")
  .optional()
  .nullable();

const sharedVehicleFields = {
  productionYear: z
    .number({ error: "yearInvalid" })
    .int("yearInvalid")
    .min(1900, "yearInvalid")
    .max(currentYear + 1, "yearInvalid"),
  vin: z
    .string()
    .trim()
    .max(17, "vinInvalid")
    .regex(/^[A-HJ-NPR-Z0-9]{0,17}$/i, "vinInvalid")
    .optional()
    .nullable()
    .or(z.literal("")),
  hsn: z
    .string()
    .trim()
    .max(4, "hsnInvalid")
    .regex(/^\d{0,4}$/, "hsnInvalid")
    .optional()
    .nullable()
    .or(z.literal("")),
  tsn: z
    .string()
    .trim()
    .max(3, "tsnInvalid")
    .regex(/^[A-Z0-9]{0,3}$/i, "tsnInvalid")
    .optional()
    .nullable()
    .or(z.literal("")),
  licensePlate: z.string().trim().max(20, "licensePlateInvalid").optional().nullable(),
  engineCode: z.string().trim().max(50, "engineInvalid").optional().nullable(),
  engineDescription: z.string().trim().max(200, "engineInvalid").optional().nullable(),
  powerKw: optionalInt,
  powerPs: optionalInt,
  torqueNm: optionalInt,
  fuelType: z.nativeEnum(FuelType).optional().nullable(),
  displacementCc: optionalInt,
  bodyType: z.nativeEnum(BodyType).optional().nullable(),
  driveType: z.nativeEnum(DriveType).optional().nullable(),
  currentOdometerKm: z
    .number({ error: "mileageInvalid" })
    .int("mileageInvalid")
    .min(0, "mileageInvalid"),
  color: z.string().trim().max(50, "colorInvalid").optional().nullable(),
  notes: z.string().trim().max(5000, "notesInvalid").optional().nullable(),
};

export const vehicleFormSchema = z
  .object({
    entryMode: z.enum(["catalog", "manual"]),
    manufacturerId: z.string().optional(),
    seriesId: z.string().optional(),
    generationId: z.string().optional(),
    variantId: z.string().optional(),
    engineId: z.string().optional(),
    catalogModelYearId: z.string().optional(),
    make: z.string().trim().max(80, "makeInvalid").optional(),
    model: z.string().trim().max(80, "modelInvalid").optional(),
    variantName: z.string().trim().max(80, "modelInvalid").optional().nullable(),
    manualEngineName: z.string().trim().max(120, "engineInvalid").optional().nullable(),
    ...sharedVehicleFields,
  })
  .superRefine((data, ctx) => {
    if (data.entryMode === "catalog") {
      const required: Array<[keyof typeof data, string]> = [
        ["manufacturerId", "manufacturerRequired"],
        ["seriesId", "seriesRequired"],
        ["catalogModelYearId", "yearRequired"],
      ];
      for (const [field, message] of required) {
        const value = data[field];
        if (!value || (typeof value === "string" && value.trim().length === 0)) {
          ctx.addIssue({ code: "custom", path: [field], message });
        }
      }
      return;
    }

    if (!data.make?.trim()) {
      ctx.addIssue({ code: "custom", path: ["make"], message: "makeRequired" });
    }
    if (!data.model?.trim()) {
      ctx.addIssue({ code: "custom", path: ["model"], message: "modelRequired" });
    }
  });

export type VehicleFormInput = z.infer<typeof vehicleFormSchema>;

export function parseVehicleFormData(formData: FormData): VehicleFormInput {
  const toOptionalInt = (key: string) => {
    const raw = formData.get(key);
    if (raw === null || raw === "") return null;
    const num = Number(raw);
    return Number.isNaN(num) ? null : num;
  };

  const toRequiredInt = (key: string) => {
    const raw = formData.get(key);
    return Number(raw);
  };

  const enumOrNull = <T extends Record<string, string>>(
    key: string,
    enumObj: T,
  ) => {
    const raw = formData.get(key);
    if (!raw || typeof raw !== "string" || raw.length === 0) return null;
    return raw in enumObj ? (raw as T[keyof T]) : null;
  };

  const entryModeRaw = String(formData.get("entryMode") ?? "catalog");
  const entryMode = entryModeRaw === "manual" ? "manual" : "catalog";

  return vehicleFormSchema.parse({
    entryMode,
    manufacturerId: String(formData.get("manufacturerId") ?? ""),
    seriesId: String(formData.get("seriesId") ?? ""),
    generationId: String(formData.get("generationId") ?? ""),
    variantId: String(formData.get("variantId") ?? ""),
    engineId: String(formData.get("engineId") ?? ""),
    catalogModelYearId: String(formData.get("catalogModelYearId") ?? ""),
    make: String(formData.get("make") ?? ""),
    model: String(formData.get("model") ?? ""),
    variantName: String(formData.get("variantName") ?? "") || null,
    manualEngineName: String(formData.get("manualEngineName") ?? "") || null,
    productionYear: toRequiredInt("productionYear"),
    vin: String(formData.get("vin") ?? ""),
    hsn: String(formData.get("hsn") ?? ""),
    tsn: String(formData.get("tsn") ?? ""),
    licensePlate: String(formData.get("licensePlate") ?? "") || null,
    engineCode: String(formData.get("engineCode") ?? "") || null,
    engineDescription: String(formData.get("engineDescription") ?? "") || null,
    powerKw: toOptionalInt("powerKw"),
    powerPs: toOptionalInt("powerPs"),
    torqueNm: toOptionalInt("torqueNm"),
    fuelType: enumOrNull("fuelType", FuelType),
    displacementCc: toOptionalInt("displacementCc"),
    bodyType: enumOrNull("bodyType", BodyType),
    driveType: enumOrNull("driveType", DriveType),
    currentOdometerKm: Number(formData.get("currentOdometerKm") ?? 0),
    color: String(formData.get("color") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  });
}
