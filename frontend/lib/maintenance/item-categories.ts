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
  fuel_additive: ["OTHER"],
};

export function suggestedCategoriesForTemplateSlug(
  slug: string | null | undefined,
): MaintenanceItemCategory[] {
  if (!slug) return [];
  return MAINTENANCE_TEMPLATE_ITEM_SUGGESTIONS[slug] ?? [];
}

/**
 * Autocomplete suggestions per item category. These power `<datalist>` hints on
 * the brand and specification fields so users can quickly pick common
 * manufacturers, oil grades, coolant classes, tire sizes, etc. — while still
 * being free to type any custom value. Lists are intentionally broad
 * (20+ entries for the common categories) and locale-neutral (brand names and
 * technical specs are the same in every language).
 */
export type MaintenanceItemSuggestions = {
  brands?: string[];
  specs?: string[];
};

export const MAINTENANCE_ITEM_SUGGESTIONS: Partial<
  Record<MaintenanceItemCategory, MaintenanceItemSuggestions>
> = {
  ENGINE_OIL: {
    brands: [
      "Castrol", "Motul", "Liqui Moly", "Mobil 1", "Shell Helix", "Total",
      "Elf", "Valvoline", "Ravenol", "Fuchs", "Mannol", "Pennzoil", "Amsoil",
      "Aral", "Petronas", "Repsol", "Eni", "Wolf", "Kroon-Oil", "Comma",
    ],
    specs: [
      "0W-20", "0W-30", "0W-40", "5W-20", "5W-30", "5W-40", "10W-40", "10W-60",
      "15W-40", "VW 504 00 / 507 00", "VW 502 00 / 505 00", "VW 508 00 / 509 00",
      "MB 229.5", "MB 229.51", "MB 229.52", "BMW LL-01", "BMW LL-04",
      "Porsche C30", "dexos2", "ACEA C3", "ACEA A3/B4", "API SN",
    ],
  },
  OIL_FILTER: {
    brands: [
      "Mann-Filter", "Mahle", "Bosch", "Hengst", "Febi", "Purflux", "Wix",
      "Fram", "K&N", "Sakura", "Blue Print", "Valeo", "UFI", "Champion",
      "Filtron", "SCT", "Meyle", "Ryco", "Kavo", "OEM original",
    ],
    specs: ["Spin-on", "Cartridge / insert"],
  },
  AIR_FILTER: {
    brands: [
      "Mann-Filter", "Mahle", "Bosch", "K&N", "Hengst", "BMC", "Pipercross",
      "Green", "Ryco", "Wix", "Febi", "Blue Print", "Purflux", "Filtron",
      "Sakura", "Valeo", "Champion", "Meyle", "UFI", "aFe",
    ],
    specs: ["Panel", "Round", "Cotton reusable"],
  },
  CABIN_FILTER: {
    brands: [
      "Mann-Filter", "Mahle", "Bosch", "Hengst", "Corteco", "Febi",
      "Blue Print", "Filtron", "Valeo", "Purflux", "Denso", "Sakura", "Wix",
      "Champion", "UFI", "Meyle", "Ryco", "K&N", "Fram", "OEM original",
    ],
    specs: ["Particle", "Activated carbon", "Anti-allergen / biofunctional"],
  },
  FUEL_FILTER: {
    brands: [
      "Mann-Filter", "Mahle", "Bosch", "Hengst", "Purflux", "Delphi", "Wix",
      "Febi", "Blue Print", "Filtron", "UFI", "Sakura", "Valeo", "Champion",
      "Meyle", "Denso", "Fram", "Kavo", "Ryco", "OEM original",
    ],
    specs: ["Diesel", "Petrol", "With water separator"],
  },
  SPARK_PLUGS: {
    brands: [
      "NGK", "Denso", "Bosch", "Champion", "Beru", "Brisk", "ACDelco",
      "Motorcraft", "Autolite", "E3",
    ],
    specs: ["Iridium", "Double iridium", "Platinum", "Double platinum", "Copper/nickel", "Laser iridium"],
  },
  GLOW_PLUGS: {
    brands: [
      "Bosch", "NGK", "Beru", "Denso", "Champion", "Hidria", "Febi", "Valeo",
      "Delphi", "BorgWarner",
    ],
    specs: ["11V", "5V ceramic", "Self-regulating"],
  },
  BRAKE_FLUID: {
    brands: [
      "ATE", "Bosch", "Motul", "Liqui Moly", "Castrol", "Brembo", "Textar",
      "TRW", "Febi", "Pentosin", "Ravenol", "Comma",
    ],
    specs: [
      "DOT 3", "DOT 4", "DOT 4 LV", "DOT 4 Class 6", "DOT 5.1",
      "ATE Type 200", "Super DOT 4", "Racing RBF 600", "Racing RBF 660",
    ],
  },
  COOLANT: {
    brands: [
      "Glysantin", "Febi", "Castrol", "Liqui Moly", "Comma", "Ravenol",
      "Mannol", "Motul", "Prestone", "Total", "Havoline", "Zerex",
    ],
    specs: [
      "G11 (blue/green)", "G12 (red)", "G12+ (red)", "G12++ (pink)",
      "G13 (purple)", "G30", "G40", "G48", "Ready-mix -37°C", "Concentrate",
    ],
  },
  TRANSMISSION_OIL: {
    brands: [
      "Castrol", "Motul", "Liqui Moly", "Fuchs", "Ravenol", "Febi",
      "Pentosin", "ZF", "Total", "Comma", "Mannol", "Red Line",
    ],
    specs: [
      "ATF Dexron VI", "ATF Dexron III", "ZF Lifeguard 6", "ZF Lifeguard 8",
      "75W-80", "75W-90", "75W-140", "80W-90", "GL-4", "GL-5",
    ],
  },
  DSG_OIL: {
    brands: [
      "VW/Audi OEM", "Febi", "Ravenol", "Fuchs", "Motul", "Liqui Moly",
      "Pentosin", "Comma",
    ],
    specs: [
      "DQ250 (wet DSG)", "DQ200 (dry DSG)", "DQ381", "DQ500", "S-Tronic",
      "G 052 182", "G 052 529", "G 055 529",
    ],
  },
  DIFFERENTIAL_OIL: {
    brands: [
      "Castrol", "Motul", "Liqui Moly", "Fuchs", "Ravenol", "Red Line",
      "Febi", "Comma", "Mannol",
    ],
    specs: ["75W-90", "75W-140", "80W-90", "GL-5", "Limited-slip (LSD)"],
  },
  BRAKE_PADS: {
    brands: [
      "Brembo", "ATE", "TRW", "Textar", "Ferodo", "Bosch", "Zimmermann",
      "Akebono", "Pagid", "EBC", "Hawk", "Mintex", "Jurid", "Delphi",
      "Bendix", "Meyle", "Febi", "StopTech", "Galfer", "OEM original",
    ],
    specs: ["Front axle", "Rear axle", "Ceramic", "Low-dust", "Sport / performance"],
  },
  BRAKE_DISCS: {
    brands: [
      "Brembo", "ATE", "Zimmermann", "TRW", "Textar", "Bosch", "EBC",
      "Ferodo", "Pagid", "DBA", "Meyle", "Febi", "StopTech", "Rotinger",
      "Girodisc", "OEM original",
    ],
    specs: ["Vented", "Solid", "Drilled", "Slotted", "Drilled + slotted", "Coated", "Front axle", "Rear axle"],
  },
  BRAKE_SENSOR: {
    brands: [
      "ATE", "Bosch", "TRW", "Textar", "Febi", "Meyle", "Brembo", "Delphi",
      "FTE", "Blue Print",
    ],
    specs: ["Front", "Rear"],
  },
  TIRES: {
    brands: [
      "Michelin", "Continental", "Bridgestone", "Goodyear", "Pirelli",
      "Dunlop", "Hankook", "Nokian", "Vredestein", "Falken", "Yokohama",
      "Kumho", "Toyo", "BFGoodrich", "Cooper", "Nexen", "Uniroyal",
      "Semperit", "Fulda", "Barum",
    ],
    specs: [
      "Summer", "Winter", "All-season", "195/65 R15", "205/55 R16",
      "225/45 R17", "225/40 R18", "235/35 R19", "245/40 R18", "255/35 R19",
    ],
  },
  WIPERS: {
    brands: [
      "Bosch", "Valeo", "SWF", "Champion", "Denso", "Trico", "Heyner",
      "Michelin", "Osram", "OEM original",
    ],
    specs: ["Aerotwin / flat", "Conventional", "Rear", "600 mm", "550 mm", "500 mm", "450 mm"],
  },
  BATTERY: {
    brands: [
      "Varta", "Bosch", "Banner", "Exide", "Yuasa", "Moll", "Optima",
      "ACDelco", "Continental", "Fiamm", "Numax",
    ],
    specs: [
      "AGM", "EFB", "Lead-acid", "Start-Stop", "12V 60Ah", "12V 70Ah",
      "12V 74Ah", "12V 80Ah", "12V 95Ah",
    ],
  },
  BELT: {
    brands: [
      "Continental (ContiTech)", "Gates", "Bosch", "INA", "SKF", "Dayco",
      "Febi", "Optibelt", "Ruville", "SNR",
    ],
    specs: [
      "Timing belt only", "Timing belt kit", "Timing belt + water pump kit",
      "V-ribbed / serpentine belt", "Tensioner kit",
    ],
  },
  GASKET: {
    brands: [
      "Elring", "Victor Reinz", "Febi", "Corteco", "Ajusa", "Payen",
      "Goetze", "BGA", "OEM original",
    ],
    specs: [
      "Oil drain plug seal", "Valve cover gasket", "Oil filter housing gasket",
      "Sump / oil pan gasket", "Head gasket", "Intake manifold gasket",
    ],
  },
};

export function getItemSuggestions(
  category: MaintenanceItemCategory,
): MaintenanceItemSuggestions {
  return MAINTENANCE_ITEM_SUGGESTIONS[category] ?? {};
}
