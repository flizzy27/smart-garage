import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .optional()
  .nullable();

export const notificationSettingsSchema = z.object({
  pushoverEnabled: z.coerce.boolean(),
  pushoverUserKey: z.string().trim().max(64).optional().nullable(),
  pushoverAppToken: z.string().trim().max(64).optional().nullable(),
  telegramEnabled: z.coerce.boolean(),
  telegramBotToken: z.string().trim().max(128).optional().nullable(),
  telegramChatId: z.string().trim().max(64).optional().nullable(),
  eventMaintenanceOverdue: z.coerce.boolean(),
  eventMaintenanceDueSoon: z.coerce.boolean(),
  eventMaintenanceLogged: z.coerce.boolean(),
  eventExpenseAdded: z.coerce.boolean(),
  deliveryImmediate: z.coerce.boolean(),
  deliveryScheduled: z.coerce.boolean(),
  scheduledTime: timeSchema,
  scheduledDays: z.string().trim().max(64).optional().nullable(),
  minIntervalHours: z.coerce.number().int().min(0).max(168),
  quietHoursEnabled: z.coerce.boolean(),
  quietHoursStart: timeSchema,
  quietHoursEnd: timeSchema,
  timezone: z.string().trim().min(1).max(64),
});

export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;

export function parseScheduledDays(formData: FormData): string {
  const days = formData
    .getAll("scheduledDays")
    .map((value) => String(value).trim().toUpperCase())
    .filter(Boolean);
  return days.length > 0 ? days.join(",") : "MO,TU,WE,TH,FR,SA,SU";
}
