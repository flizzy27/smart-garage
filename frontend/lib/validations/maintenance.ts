import { z } from "zod";
import { optionalEuroAmountSchema } from "@/lib/validations/money";
import { maintenanceItemsArraySchema } from "@/lib/validations/maintenance-items";

export const createScheduleSchema = z.object({
  vehicleId: z.string().min(1),
  templateId: z.string().optional(),
  customName: z.string().max(120).optional(),
  category: z.enum([
    "ENGINE",
    "FILTERS",
    "FLUIDS",
    "BRAKES",
    "TIRES",
    "INSPECTION",
    "ADDITIVE",
    "OTHER",
  ]).optional(),
  intervalKm: z.coerce.number().int().min(0).max(500_000).optional().nullable(),
  intervalMonths: z.coerce.number().int().min(0).max(120).optional().nullable(),
  estimatedCostCents: optionalEuroAmountSchema,
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional(),
  lastPerformedAt: z.string().optional(),
  lastOdometerKm: z.coerce.number().int().min(0).optional().nullable(),
});

export const updateScheduleSchema = createScheduleSchema
  .omit({ vehicleId: true, templateId: true })
  .extend({
    scheduleId: z.string().min(1),
    isActive: z.coerce.boolean().optional(),
  });

export const logMaintenanceSchema = z.object({
  scheduleId: z.string().min(1),
  performedAt: z.string().min(1),
  odometerKm: z.coerce.number().int().min(0).optional().nullable(),
  costCents: optionalEuroAmountSchema,
  currency: z.string().length(3).optional(),
  vendorName: z.string().max(120).optional(),
  note: z.string().max(4000).optional(),
  saveAsDefault: z.coerce.boolean().optional(),
});

export const updateMaintenanceRecordSchema = z.object({
  recordId: z.string().min(1),
  performedAt: z.string().min(1),
  odometerKm: z.coerce.number().int().min(0).optional().nullable(),
  costCents: optionalEuroAmountSchema,
  currency: z.string().length(3).optional(),
  vendorName: z.string().max(120).optional(),
  note: z.string().max(4000).optional(),
  saveAsDefault: z.coerce.boolean().optional(),
});

export const saveScheduleDefaultsSchema = z.object({
  scheduleId: z.string().min(1),
  items: maintenanceItemsArraySchema,
});

export const clearScheduleDefaultsSchema = z.object({
  scheduleId: z.string().min(1),
});

export type UpdateMaintenanceRecordInput = z.infer<typeof updateMaintenanceRecordSchema>;
export type SaveScheduleDefaultsInput = z.infer<typeof saveScheduleDefaultsSchema>;

export const setupWarningSchema = z.object({
  scheduleId: z.string().min(1),
  vehicleId: z.string().min(1),
  action: z.enum(["done", "circa", "unknown", "skip"]),
  performedAt: z.string().optional(),
  circaMonthsAgo: z.coerce.number().int().min(1).max(120).optional(),
});

export type SetupWarningInput = z.infer<typeof setupWarningSchema>;

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type LogMaintenanceInput = z.infer<typeof logMaintenanceSchema>;
