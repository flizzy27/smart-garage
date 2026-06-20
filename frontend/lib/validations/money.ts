import { z } from "zod";

function parseEurosToCents(value: unknown): number | null | undefined {
  if (value == null || value === "") return undefined;
  const raw = String(value).trim().replace(",", ".");
  const euros = parseFloat(raw);
  if (Number.isNaN(euros) || euros < 0) return null;
  return Math.round(euros * 100);
}

/** Form field in euros → stored as integer cents (optional). */
export const optionalEuroAmountSchema = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform(parseEurosToCents);

/** Form field in euros → stored as integer cents (defaults to 0). */
export const euroAmountSchema = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => parseEurosToCents(value) ?? 0);
