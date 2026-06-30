import type { BodyType, DriveType, FuelType } from "@prisma/client";
import { parseBodyType, parseDriveType, parseFuelType } from "@/lib/catalog/parse-style";
import type { CardataRow } from "@/lib/catalog/sources/cardata-wiki";

const JUNK_MODEL_PATTERN =
  /photos|\bengines\b|^\d{4}\s|news|reviews|specifications?\s*$/i;

export function isValidCardataModel(model: string): boolean {
  const trimmed = model?.trim();
  if (!trimmed || trimmed.length < 2) return false;
  if (JUNK_MODEL_PATTERN.test(trimmed)) return false;
  return true;
}

export function parseCardataYear(value: string): number | null {
  const year = parseInt(value, 10);
  if (Number.isNaN(year) || year < 1886 || year > 2035) return null;
  return year;
}

export function expandYearRange(yearFrom: number, yearTo: number | null): number[] {
  const end = yearTo ?? yearFrom;
  if (end < yearFrom) return [yearFrom];
  const years: number[] = [];
  for (let year = yearFrom; year <= end; year++) years.push(year);
  return years;
}

export function formatGenerationName(yearFrom: number, yearTo: number | null): string {
  if (yearTo == null || yearTo === yearFrom) return String(yearFrom);
  return `${yearFrom}–${yearTo}`;
}

const CARDATA_FUEL: Record<string, FuelType> = {
  PETROL: "PETROL",
  GASOLINE: "PETROL",
  DIESEL: "DIESEL",
  ELECTRIC: "ELECTRIC",
  HYBRID: "HYBRID",
  "PLUG-IN HYBRID": "PLUGIN_HYBRID",
  PHEV: "PLUGIN_HYBRID",
  LPG: "LPG",
  CNG: "CNG",
};

const CARDATA_DRIVE: Record<string, DriveType> = {
  FWD: "FWD",
  RWD: "RWD",
  AWD: "AWD",
  "4WD": "AWD",
  "4X4": "AWD",
};

export function mapCardataFuelType(row: CardataRow): FuelType | null {
  const raw = row.engineFuelType?.trim().toUpperCase();
  if (raw && CARDATA_FUEL[raw]) return CARDATA_FUEL[raw];
  return parseFuelType(`${row.variant} ${row.model}`);
}

export function mapCardataDriveType(row: CardataRow): DriveType | null {
  const raw = row.drivetrain?.trim().toUpperCase();
  if (raw && CARDATA_DRIVE[raw]) return CARDATA_DRIVE[raw];
  return parseDriveType(`${row.variant} ${row.model}`);
}

export function mapCardataBodyType(row: CardataRow): BodyType | null {
  const raw = row.bodyType?.trim();
  if (raw) {
    const mapped = parseBodyType(raw);
    if (mapped) return mapped;
  }
  return parseBodyType(`${row.model} ${row.variant}`);
}

export function buildVariantLabel(row: CardataRow): string {
  const parts: string[] = [];
  const body = mapCardataBodyType(row);
  if (body) parts.push(formatBodyLabel(body));
  if (row.doors) parts.push(`${row.doors}-door`);
  const drive = mapCardataDriveType(row);
  if (drive) parts.push(drive);
  return parts.length > 0 ? parts.join(" · ") : "Standard";
}

function formatBodyLabel(body: BodyType): string {
  switch (body) {
    case "HATCHBACK":
      return "Hatchback";
    case "SEDAN":
      return "Sedan";
    case "WAGON":
      return "Wagon";
    case "COUPE":
      return "Coupe";
    case "CONVERTIBLE":
      return "Convertible";
    case "SUV":
      return "SUV";
    case "VAN":
      return "Van";
    case "PICKUP":
      return "Pickup";
    default:
      return body;
  }
}

export function parseCardataDisplacementCc(row: CardataRow): number | null {
  const raw = row.engineDisplacement?.trim();
  if (!raw) return null;
  const cc = parseInt(raw, 10);
  if (Number.isNaN(cc) || cc <= 0) return null;
  return cc;
}

export function parseCardataPower(row: CardataRow): {
  powerKw: number | null;
  powerPs: number | null;
} {
  const kwRaw = row.enginePowerKw?.trim();
  const psRaw = row.enginePowerBhp?.trim();

  let powerKw: number | null = null;
  let powerPs: number | null = null;

  if (kwRaw) {
    const kw = parseFloat(kwRaw);
    if (!Number.isNaN(kw) && kw > 0) powerKw = Math.round(kw);
  }
  if (psRaw) {
    const ps = parseFloat(psRaw);
    if (!Number.isNaN(ps) && ps > 0) powerPs = Math.round(ps);
  }

  return { powerKw, powerPs };
}

export function parseCardataTorque(row: CardataRow): number | null {
  const raw = row.engineTorqueNm?.trim();
  if (!raw) return null;
  const torque = parseInt(raw, 10);
  if (Number.isNaN(torque) || torque <= 0) return null;
  return torque;
}

export function buildTransmissionTypes(row: CardataRow): string[] | null {
  const gearbox = row.gearboxType?.trim();
  const gears = row.gears?.trim();
  if (!gearbox && !gears) return null;

  const label = [gearbox, gears ? `${gears}-speed` : null]
    .filter(Boolean)
    .join(" ");
  return label ? [label] : null;
}

export function buildEngineName(row: CardataRow): string {
  const name = row.variant?.trim();
  return name && name.length > 0 ? name : "Base";
}

export function parseCardataInt(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const n = parseInt(value.trim(), 10);
  return Number.isNaN(n) || n <= 0 ? null : n;
}

export function parseCardataAspiration(row: CardataRow): string | null {
  const raw = row.engineAspiration?.trim();
  if (!raw || raw.toLowerCase() === "naturally aspirated" || raw.toLowerCase() === "na") return null;
  return raw || null;
}
