import { z } from "zod";

const tagsSchema = z
  .array(z.string().trim().min(1).max(30))
  .max(8)
  .optional()
  .default([]);

export const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().max(20000).optional().default(""),
  vehicleId: z.string().trim().min(1).optional().nullable(),
  maintenanceTemplateId: z.string().trim().min(1).optional().nullable(),
  maintenanceRecordId: z.string().trim().min(1).optional().nullable(),
  isPinned: z.coerce.boolean().optional().default(false),
  tags: tagsSchema,
});

export const updateNoteSchema = createNoteSchema.extend({
  noteId: z.string().min(1),
});

export const noteFiltersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  vehicleId: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  pinnedOnly: z.coerce.boolean().optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NoteFiltersInput = z.infer<typeof noteFiltersSchema>;

/** Parse a free-form comma-separated tags string from a form field into a clean array. */
export function parseTagsInput(raw: FormDataEntryValue | null): string[] {
  if (!raw || typeof raw !== "string") return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8),
    ),
  );
}
