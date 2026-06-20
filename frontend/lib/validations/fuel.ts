import { z } from "zod";
import { optionalEuroAmountSchema } from "@/lib/validations/money";

export const createFuelEntrySchema = z.object({
  vehicleId: z.string().min(1),
  filledAt: z.string().min(1),
  odometerKm: z.coerce.number().int().min(0).optional().nullable(),
  liters: z.coerce.number().min(0).max(500).optional().nullable(),
  totalCostCents: optionalEuroAmountSchema,
  currency: z.string().length(3).optional(),
  stationName: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
});

export type CreateFuelEntryInput = z.infer<typeof createFuelEntrySchema>;
