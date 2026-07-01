import type { MaintenanceItemCategory, MaintenanceItemUnit } from "@prisma/client";

/** All selectable maintenance item categories, in a sensible UI order. */
export const MAINTENANCE_ITEM_CATEGORIES: MaintenanceItemCategory[] = [
  "ENGINE_OIL",
  "OIL_FILTER",
  "AIR_FILTER",
  "CABIN_FILTER",
  "FUEL_FILTER",
  "SPARK_PLUGS",
  "GLOW_PLUGS",
  "BRAKE_FLUID",
  "COOLANT",
  "TRANSMISSION_OIL",
  "DSG_OIL",
  "DIFFERENTIAL_OIL",
  "BRAKE_PADS",
  "BRAKE_DISCS",
  "BRAKE_SENSOR",
  "TIRES",
  "WIPERS",
  "BATTERY",
  "BELT",
  "GASKET",
  "OTHER",
];

export const MAINTENANCE_ITEM_UNITS: MaintenanceItemUnit[] = [
  "LITERS",
  "MILLILITERS",
  "PIECES",
  "SETS",
  "KG",
  "GRAMS",
  "CUSTOM",
];

/** Categories that are typically measured as fluids (liters/milliliters). */
const FLUID_CATEGORIES: MaintenanceItemCategory[] = [
  "ENGINE_OIL",
  "BRAKE_FLUID",
  "COOLANT",
  "TRANSMISSION_OIL",
  "DSG_OIL",
  "DIFFERENTIAL_OIL",
];

export function defaultUnitForCategory(
  category: MaintenanceItemCategory,
): MaintenanceItemUnit {
  if (FLUID_CATEGORIES.includes(category)) return "LITERS";
  if (category === "SPARK_PLUGS" || category === "GLOW_PLUGS" || category === "WIPERS") {
    return "PIECES";
  }
  if (category === "TIRES") return "SETS";
  return "PIECES";
}

/**
 * Suggested item categories per maintenance template slug, used purely as
 * quick-add shortcuts in the UI. Users can always add any category or a
 * fully custom item — this list does not restrict input.
 */
export const MAINTENANCE_TEMPLATE_ITEM_SUGGESTIONS: Record<
  string,
  MaintenanceItemCategory[]
> = {
  oil_change: ["ENGINE_OIL", "OIL_FILTER", "GASKET"],
  air_filter: ["AIR_FILTER"],
  cabin_filter: ["CABIN_FILTER"],
  fuel_filter: ["FUEL_FILTER"],
  brake_fluid: ["BRAKE_FLUID"],
  coolant: ["COOLANT"],
  transmission_fluid: ["TRANSMISSION_OIL", "DSG_OIL", "DIFFERENTIAL_OIL"],
  spark_plugs: ["SPARK_PLUGS"],
  timing_belt: ["BELT"],
  brake_pads: ["BRAKE_PADS", "BRAKE_SENSOR"],
  brake_discs: ["BRAKE_DISCS", "BRAKE_PADS"],
  tire_rotation: ["TIRES"],
  tire_change_seasonal: ["TIRES"],
  wiper_blades: ["WIPERS"],
  battery_check: ["BATTERY"],
};

export function suggestedCategoriesForTemplateSlug(
  slug: string | null | undefined,
): MaintenanceItemCategory[] {
  if (!slug) return [];
  return MAINTENANCE_TEMPLATE_ITEM_SUGGESTIONS[slug] ?? [];
}
