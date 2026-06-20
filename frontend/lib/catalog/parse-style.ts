import type { BodyType, DriveType, FuelType } from "@prisma/client";

const BODY_PATTERNS: Array<[RegExp, BodyType]> = [
  [/\bSEDAN\b/i, "SEDAN"],
  [/\bHATCH\b|\bHATCHBACK\b/i, "HATCHBACK"],
  [/\bWAGON\b|\bAVANT\b|\bTOURING\b|\bESTATE\b/i, "WAGON"],
  [/\bCOUPE\b|\bCOUP[EÉ]\b/i, "COUPE"],
  [/\bCONV\b|\bCONVERTIBLE\b|\bCABRIOLET\b|\bCAB\b|\bROADSTER\b/i, "CONVERTIBLE"],
  [/\bSUV\b|\bCROSSOVER\b|\bX\d\b/i, "SUV"],
  [/\bVAN\b|\bMINIVAN\b|\bMPV\b/i, "VAN"],
  [/\bPICKUP\b|\bTRUCK\b|\bCREW CAB\b/i, "PICKUP"],
];

const DRIVE_PATTERNS: Array<[RegExp, DriveType]> = [
  [/\bQUATTRO\b|\bAWD\b|\b4WD\b|\b4X4\b|\bX[D]?DRIVE\b/i, "AWD"],
  [/\bFWD\b|\bFRONT[- ]WHEEL\b/i, "FWD"],
  [/\bRWD\b|\bREAR[- ]WHEEL\b/i, "RWD"],
  [/\b4MATIC\b|\bXDRIVE\b|\bSH[- ]AWD\b/i, "AWD"],
];

export function parseBodyType(styleName: string): BodyType | null {
  for (const [pattern, type] of BODY_PATTERNS) {
    if (pattern.test(styleName)) return type;
  }
  return null;
}

export function parseDriveType(styleName: string): DriveType | null {
  for (const [pattern, type] of DRIVE_PATTERNS) {
    if (pattern.test(styleName)) return type;
  }
  if (/\bQUATTRO\b/i.test(styleName)) return "AWD";
  return null;
}

export function parseFuelType(styleName: string): FuelType | null {
  const upper = styleName.toUpperCase();
  if (/\bTDI\b|\bDIESEL\b|\bCDI\b|\bD\d\b/.test(upper)) return "DIESEL";
  if (/\bELECTRIC\b|\bEV\b|\be-TRON\b|\bI\d\b EV/.test(upper)) return "ELECTRIC";
  if (/\bPHEV\b|\bPLUGIN\b|\bPLUG[- ]IN\b/.test(upper)) return "PLUGIN_HYBRID";
  if (/\bHYBRID\b|\bHEV\b/.test(upper)) return "HYBRID";
  if (/\bLPG\b/.test(upper)) return "LPG";
  if (/\bCNG\b|\bNATURAL GAS\b/.test(upper)) return "CNG";
  if (
    /\b\d(\.\d)?T\b|\bTFSI\b|\bTSI\b|\bTURBO\b|\bV\d\b|\bI\d\b|\bGDI\b|\bMPI\b/.test(
      upper,
    )
  ) {
    return "PETROL";
  }
  return null;
}

/** Extract displacement in cc from style strings like "2.0T", "3.0", "1.8T". */
export function parseDisplacementCc(styleName: string): number | null {
  const match = styleName.match(/(?:^|\s|\/)(\d(?:\.\d)?)(?:T|L|\s|$)/i);
  if (!match) return null;
  const liters = parseFloat(match[1]);
  if (Number.isNaN(liters) || liters <= 0 || liters > 12) return null;
  return Math.round(liters * 1000);
}

/** Derive a human-readable engine label from an OVD style name. */
export function parseEngineName(styleName: string, modelName: string): string {
  const withoutModel = styleName
    .replace(new RegExp(`^${escapeRegex(modelName)}\\s*`, "i"), "")
    .trim();

  const engineMatch = withoutModel.match(
    /(\d(?:\.\d)?(?:T|L)?(?:\s*(?:TFSI|TSI|TDI|CDI|Hybrid|Electric))?|\bV\d[\d.]*|\bI\d[\d.]*)/i,
  );

  if (engineMatch) return engineMatch[1].trim();

  const displacement = parseDisplacementCc(withoutModel);
  if (displacement) return `${(displacement / 1000).toFixed(1)}L`;

  return "Base";
}

/** Derive variant/trim label (body + drive, without engine displacement). */
export function parseVariantName(styleName: string, modelName: string): string {
  let label = styleName
    .replace(new RegExp(`^${escapeRegex(modelName)}\\s*`, "i"), "")
    .trim();

  label = label
    .replace(/\b\d(?:\.\d)?(?:T|L)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return label.length > 0 ? label : "Standard";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function kwToPs(kw: number): number {
  return Math.round(kw * 1.35962);
}

export function psToKw(ps: number): number {
  return Math.round(ps / 1.35962);
}
