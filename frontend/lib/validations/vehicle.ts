import { BodyType, DriveType, FuelType } from "@prisma/client";
import { z } from "zod";

const currentYear = new Date().getFullYear();

const optionalInt = z
  .number({ error: "invalid" })
  .int("invalid")
  .optional()
  .nullable();

export const vehicleFormSchema = z.object({
  manufacturerId: z.string().min(1, "manufacturerRequired"),
  seriesId: z.string().min(1, "seriesRequired"),
  generationId: z.string().min(1, "generationRequired"),
  variantId: z.string().min(1, "variantRequired"),
  engineId: z.string().min(1, "engineRequired"),
  catalogModelYearId: z.string().min(1, "yearRequired"),
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

  return vehicleFormSchema.parse({
    manufacturerId: String(formData.get("manufacturerId") ?? ""),
    seriesId: String(formData.get("seriesId") ?? ""),
    generationId: String(formData.get("generationId") ?? ""),
    variantId: String(formData.get("variantId") ?? ""),
    engineId: String(formData.get("engineId") ?? ""),
    catalogModelYearId: String(formData.get("catalogModelYearId") ?? ""),
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
