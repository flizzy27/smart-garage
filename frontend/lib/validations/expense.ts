import { z } from "zod";
import { optionalEuroAmountSchema } from "@/lib/validations/money";

export const expenseCategorySchema = z.enum([
  "MAINTENANCE",
  "FUEL",
  "INSURANCE",
  "TAX",
  "REGISTRATION",
  "REPAIR",
  "ACCESSORY",
  "OTHER",
]);

export const createExpenseSchema = z.object({
  vehicleId: z.string().min(1),
  category: expenseCategorySchema,
  occurredAt: z.string().min(1),
  amountCents: optionalEuroAmountSchema,
  currency: z.string().length(3).optional(),
  odometerKm: z.coerce.number().int().min(0).optional().nullable(),
  maintenanceRecordId: z.string().optional(),
  description: z.string().max(500).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
